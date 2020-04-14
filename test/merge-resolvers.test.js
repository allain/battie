const { mergeResolvers } = require('../src/index')

it('merges top level Resolvers', async () => {
    const merged = mergeResolvers([{
        test() {
            return { a: 10 }
        }
    }, {
        test: {
            b() {
                return 20
            }
        }
    }])

    expect(merged).not.toBeNull()

    expect(typeof merged.test).toEqual('function')

    expect(merged.test()).toBeInstanceOf(Promise)

    const testResult = await merged.test()
    expect(testResult.a).toEqual(10)

    expect(typeof testResult.b).toEqual('function')
    expect(await testResult.b()).toEqual(20)
})

it('supports Promises', async () => {
    const merged = mergeResolvers([{
        async test() {
            return { a: 10 }
        }
    }, {
        test: {
            b() {
                return 20
            }
        }
    }])


    expect(typeof merged.test).toEqual('function')

    expect(merged.test()).toBeInstanceOf(Promise)

    expect(typeof (await merged.test()).b).toEqual('function')
    expect((await merged.test()).b()).toEqual(20)
})
