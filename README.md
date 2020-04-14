# Battie

Battie is a batty microkernel tool for composing GraphQL APIs from a collection of Plugins.

You can think of it as a schema stitcher with some smarts.

```js
const { App } = require('..')

// Core Plugin that defines a User type
const corePlugin = {
    typeDefs: `
        type Query { me: User }
        type User { id: ID! name: String! } 
    `,
    resolvers: {
        Query: {
            me(_, __, { app }) {
                app.emit('hello', 'world!') // app is an event emitter

                return { id: "user1", name: "Bob" }
            }
        }
    },
    setup(app) {
        // register a handler that can be used from any other plugin
        app.handler('log', (...args) => console.log("LOG:", ...args))
    }
}

// Extends the core to tracks emails for each user
const emailPlugin = {
    setup(app) {
        // register for event notifications from the app
        app.on('hello', (...args) => {
            console.log('EVENT:', ...args)
        })
    },
    typeDefs: `
        type User {
            emails : [Email]
        }
        type Email {
            subject: String
        }
    `,
    resolvers: {
        User: {
            async emails(user, _, { app }) {
                await app.handle('log', 'Requesting emails!')

                return [{
                    subject: "Test 1"
                }, {
                    subject: "Test 2"
                }]
            }
        }
    },
}

const app = new App([
    corePlugin,
    emailPlugin
])

const result = app.execute(`
    query {
        me {
            id
            name
            emails {
                subject
            }
        }
    }
`)

result.then(result => {
    console.log(JSON.stringify(result, null, 2))
})
```