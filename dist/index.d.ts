/// <reference types="node" />
import { ITypeDefinitions, IResolvers } from 'graphql-tools';
import { EventEmitter } from 'events';
export interface Plugin {
    name: string;
    typeDefs: ITypeDefinitions;
    resolvers?: IResolvers<any, any> | Array<IResolvers<any, any>>;
    setup(app: App): Promise<void>;
    teardown(app: App): Promise<void>;
}
export declare class App extends EventEmitter {
    private plugins;
    private _handlers;
    private _setup;
    private _preparedSchema;
    constructor(plugins?: Plugin[]);
    addPlugin(plugin: Plugin): void;
    plugin(name: string): Plugin | null;
    handler(name: string, handler: Function): void;
    handle(name: any, ...args: any[]): Promise<void>;
    setup(): Promise<void>;
    teardown(): Promise<void>;
    _schema(): any;
    execute(query: any, vars?: {}, context?: {}): Promise<import("graphql").ExecutionResult<import("graphql/execution/execute").ExecutionResultDataDefault>>;
}
export declare function mergeTypeDefs(typeDefs: any): ITypeDefinitions;
export declare function mergeResolvers(resolvers: any): any;
