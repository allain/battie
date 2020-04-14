const { mergeTypeDefs } = require('../src/index')
const { parse, print } = require('graphql')

it('merges top level Types', () => {
    const merged = mergeTypeDefs([`
    type A {
        name: String!
    }`, `type A { 
        age: Int!
    }`])

    expect(print(merged)).toEqual(print(parse(`type A {
        name: String!
        age: Int!
    }`)))
})

it('merges relations', () => {
    const merged = mergeTypeDefs([`
    type A {
        b: B!
    }`, `
    type A {
        parent: A
    }
    
    type B { 
        age: Int!
        as: [A]!
    }`])

    expect(print(merged)).toEqual(print(parse(`type A {
        b: B!
        parent: A
    }
    
    type B {
        age:Int!
        as: [A]!
    }`)))

})

it('merges top level Inputs', () => {
    const merged = mergeTypeDefs([`
    input A {
        name: String!
    }`, `input A { 
        age: Int!
    }`])

    expect(print(merged)).toEqual(print(parse(`input A {
        name: String!
        age: Int!
    }`)))
})

it('throws when types mismatch', () => {
    expect(() => {
        mergeTypeDefs([`type A { id: ID}`, `input A { id: ID}`])
    }).toThrowError('definition type mismatch: ObjectTypeDefinition != InputObjectTypeDefinition')
})
