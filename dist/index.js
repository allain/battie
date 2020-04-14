"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_tools_1 = require("graphql-tools");
const graphql_1 = require("graphql");
const events_1 = require("events");
class App extends events_1.EventEmitter {
    constructor(plugins = []) {
        super();
        this.plugins = [];
        this._handlers = {};
        this._setup = false;
        this.plugins = plugins || [];
        this._handlers = {};
        this._setup = false;
        this._preparedSchema = null;
    }
    addPlugin(plugin) {
        this.plugins.push(plugin);
    }
    plugin(name) {
        return this.plugins.find(p => p.name === name) || null;
    }
    handler(name, handler) {
        this._handlers[name] = (this._handlers[name] || []).concat(handler);
    }
    async handle(name, ...args) {
        if (!this._handlers[name]) {
            return;
        }
        for (const handler of this._handlers[name]) {
            await handler(...args);
        }
    }
    async setup() {
        if (this._setup)
            return;
        for (const plugin of this.plugins) {
            if (plugin.setup) {
                await plugin.setup(this);
            }
        }
        this._setup = true;
    }
    async teardown() {
        if (!this._setup)
            return;
        for (const plugin of this.plugins) {
            if (plugin.teardown) {
                await plugin.teardown(this);
            }
        }
        this._setup = false;
    }
    _schema() {
        if (!this._preparedSchema && this.plugins.filter(p => p.typeDefs).length) {
            this._preparedSchema = graphql_tools_1.makeExecutableSchema({
                typeDefs: mergeTypeDefs(this.plugins.map(p => p.typeDefs).filter(Boolean)),
                resolvers: mergeResolvers(this.plugins.map(p => p.resolvers))
            });
        }
        return this._preparedSchema;
    }
    async execute(query, vars = {}, context = {}) {
        await this.setup();
        const schema = this._schema();
        if (!schema)
            throw new Error('unable to build schema');
        return graphql_1.graphql({
            schema,
            source: query,
            variableValues: vars,
            contextValue: { ...context, app: this }
        });
    }
}
exports.App = App;
function mergeTypeDefs(typeDefs) {
    const prepared = typeDefs.map(t => typeof t === 'string' ? graphql_1.parse(t) : t);
    const definitions = prepared.map(doc => mapDefinitions(doc.definitions));
    const mergedDefs = definitions.reduce((result, td, index) => {
        for (const [name, def] of Object.entries(td)) {
            if (!result[name]) {
                result[name] = def;
                continue;
            }
            if (result[name].kind !== def.kind) {
                throw new Error(`definition type mismatch: ${result[name].kind} != ${def.kind}`);
            }
            result[name] = mergeDefinitions(result[name], def);
        }
        return result;
    }, {});
    return {
        kind: 'Document',
        definitions: Object.values(mergedDefs)
    };
}
exports.mergeTypeDefs = mergeTypeDefs;
function mergeDefinitions(obj1, obj2) {
    return { ...obj1, fields: obj1.fields.concat(obj2.fields) };
}
function mapDefinitions(definitions) {
    return definitions.reduce((result, def) => {
        // @ts-ignore
        result[def.name.value] = def;
        return result;
    }, {});
}
function mergeResolvers(resolvers) {
    return resolvers.reduce((result, resolver) => {
        return mergeResolver(result, resolver);
    });
}
exports.mergeResolvers = mergeResolvers;
const isObject = x => typeof x === 'object' && !Array.isArray(x);
const isFunction = x => typeof x === 'function';
const isUndefined = x => typeof x === 'undefined';
function mergeResolver(target, resolver) {
    if (isUndefined(target))
        return resolver;
    if (isUndefined(resolver))
        return target;
    if (isObject(target)) {
        if (isFunction(resolver)) {
            return async (...args) => {
                const result = await resolver(...args);
                return mergeResolver(target, result);
            };
        }
        if (!isObject(resolver))
            throw new Error(`cannot merge ${typeof target} and ${typeof resolver}`);
        const result = { ...target };
        for (const [prop, r] of Object.entries(resolver)) {
            result[prop] = mergeResolver(target[prop], r);
        }
        return result;
    }
    if (isFunction(target)) {
        return async (...args) => {
            const result = await target(...args);
            const resolverResult = await isFunction(resolver) ? resolver(...args) : resolver;
            return mergeResolver(result, resolverResult);
        };
    }
    else {
        console.log(`could not merge ${target} and ${resolver}`);
    }
    return target;
}
