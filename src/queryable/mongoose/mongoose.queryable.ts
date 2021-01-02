import { MongooseQuery } from "./mongoose.query";
import { Model, Document, Connection } from "mongoose";
import { IQuery, Queryable } from "@pablor21/queryable-js";

export interface IMongooseQueryableOptions {
    useLean?: boolean;
}

const defaultOptions: IMongooseQueryableOptions = {
    useLean: true
}

export class MongooseQueryable<T extends Document<T> = Document<any>, QueryType extends MongooseQuery<T> = MongooseQuery<T>> extends Queryable<T, QueryType>{
    protected _model: Model<T>;

    constructor(model: string | Model<T>, public connection?: Connection,protected options: IMongooseQueryableOptions = defaultOptions) {
        super(MongooseQuery);
        if (model instanceof String) {
            this._model = this.connection?.model(model as string) as Model<T>;
            if (!this._model) {
                throw Error(`Cannot find the model '${model}' in the connection!`);
            }
        } else {
            this._model = model as Model<T>;
        }
    }


    public get model(): Model<T> {
        return this._model;
    }

    public async prepareQuery(query: IQuery): Promise<QueryType> {
        query = await super.prepareQuery(query);
        (query as MongooseQuery<T>).for(this.model);
        return query as QueryType;
    }

}