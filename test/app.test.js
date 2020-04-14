const { App } = require('../src/index')
const gql = require('graphql-tag')

it('can be created', () => {
    const app = new App()
    expect(app).toBeTruthy()
})

it('exposes EventEmitter interface', () => {
    const app = new App()
    expect(typeof app.on).toEqual('function')
    expect(typeof app.once).toEqual('function')
    expect(typeof app.emit).toEqual('function')
})

it('plugins get setup and torndown', async () => {
    const app = new App()

    const plugin = {
        setup: jest.fn(a => {
            expect(app).toEqual(a)
        }),
        teardown: jest.fn(a => {
            expect(app).toEqual(a)
        })
    }
    app.addPlugin(plugin)

    await app.setup()

    await app.teardown()

    expect(plugin.setup).toHaveBeenCalledTimes(1)
    expect(plugin.teardown).toHaveBeenCalledTimes(1)
})

it('can serve plugin', async () => {
    const app = new App([
        {
            typeDefs: gql`
                type Test { name: String! }
                type Query { test: Test }
            `,
            resolvers: {
                Query: {
                    test() {
                        return {
                            name: "Testing"
                        }
                    }
                }
            }
        }
    ])

    const result = await app.execute(`query {
        test {
            name
        }
    }`)

    expect(result.errors).toBeUndefined()

    expect(result).toEqual({
        data: {
            test: {
                name: "Testing"
            }
        }
    })
})

it('can merge two function resolvers', async () => {
    const app = new App([
        {
            typeDefs: gql`
                type Test { name: String! }
                type Query { test: Test }
            `,
            resolvers: {
                Query: {
                    test() {
                        return {
                            name: "Testing"
                        }
                    }
                }
            }
        },
        {
            typeDefs: gql`
            type Test {
                age: Int!
            }
            `,
            resolvers: {
                Query: {
                    test() {
                        return {
                            age: 41
                        }
                    }
                }
            }
        }
    ])

    const result = await app.execute(`query {
        test {
            age
            name
        }
    }`)

    expect(result.errors).toBeUndefined()

    expect(result).toEqual({
        data: {
            test: {
                age: 41,
                name: "Testing"
            }
        }
    })
})

it('can merge two object resolvers', async () => {
    const app = new App([
        {
            typeDefs: gql`
                type Test { id: ID, name: String }
                type Query { test: Test }
            `,
            resolvers: {
                Query: {
                    test() {
                        return {
                            id() {
                                return "123"
                            }
                        }
                    }
                },
                Test: {
                    name() {
                        return 'Testing'
                    }
                }
            }
        },
        {
            typeDefs: gql`
            type Test { age: Int }
            `,
            resolvers: {
                Test: {
                    age() {
                        return 41
                    }
                }
            }
        }
    ])

    const result = await app.execute(`query {
        test {
            id
            age
            name
        }
    }`)

    expect(result.errors).toBeUndefined()

    expect(result).toEqual({
        data: {
            test: {
                id: "123",
                age: 41,
                name: "Testing"
            }
        }
    })
})

it('supports naming plugins', () => {
    const app = new App()
    const plugin = {
        name: 'TEST'
    }
    app.addPlugin(plugin)

    expect(app.plugin('TEST')).toEqual(plugin)
    expect(app.plugin('MISSING')).toBeNull()
})

it('supports registering handlers from plugin', async () => {
    let handled = null

    const plugins = [
        {
            setup(app) {
                app.handler('echo', async (x) => handled = x)
            }
        },
        {
            typeDefs: gql`
                type Query {
                   test(x:String):String 
                } 
            `,
            resolvers: {
                Query: {
                    async test(_, { x }, { app }) {
                        await app.handle('echo', x)
                        return handled
                    }
                }
            }
        }
    ]
    const app = new App(plugins)

    const result = await app.execute('{test(x:"HELLO")}')
    expect(result).toEqual({
        data: {
            test: 'HELLO'
        }
    })
})

it('supports calling handle when no handler is registered', async () => {
    const plugins = [
        {
            typeDefs: gql`
                type Query {
                   test:String 
                } 
            `,
            resolvers: {
                Query: {
                    async test(_, __, { app }) {
                        await app.handle('missing')
                        return 'HELLO'
                    }
                }
            }
        }
    ]
    const app = new App(plugins)

    const result = await app.execute('{test}')
    expect(result).toEqual({
        data: {
            test: 'HELLO'
        }
    })
})

it('rejects with first handle failure', async () => {
    let neverCalled = jest.fn()
    const plugins = [
        {
            setup(app) {
                app.handler('fail', () => Promise.reject("FAIL"))
            }
        },
        {
            setup(app) {
                app.handler('fail', neverCalled)
            },
            typeDefs: gql`
                type Query {
                   test:String 
                } 
            `,
            resolvers: {
                Query: {
                    async test(_, __, { app }) {
                        await app.handle('fail')
                        return 'HELLO'
                    }
                }
            }
        }
    ]
    const app = new App(plugins)

    const result = await app.execute('{test}')
    expect(result.data).toEqual({ test: null })
    expect(result.errors[0].message).toEqual('Unexpected error value: "FAIL"')
})
