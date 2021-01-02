import { IIncludeQueryParams, IQuery, IQueryParser, Query } from "@pablor21/queryable-js";
import { IMongooseQueryParams } from "./mongoose.queryparams";
import { MongooseQueryParser } from "./mongoose.queryparser";
import { Model, Document, Query as MQuery } from "mongoose";

export interface IMongooseQueryOptions {
    useLean?: boolean;
}

export const defaultOptions: IMongooseQueryOptions = {
    useLean: true
}

export class MongooseQuery<T extends Document<T> = Document<any>> extends Query<T> implements IQuery<T> {
    public model?: Model<T>;

    constructor(parser?: IQueryParser, model?: Model<T>, public options: IMongooseQueryOptions = defaultOptions) {
        super(parser || new MongooseQueryParser());
        this.model = model;
    }

    public for(model: Model<T>): MongooseQuery<T> {
        this.model = model;
        return this;
    }

   
    public async findByArgs(
        args: IMongooseQueryParams,
        config?: any,
    ): Promise<T[]> {
        if (!this.model) {
            throw Error('You must specify the model to query!');
        }
        args = args || {};
        config = config || {};
        const query = this.addArgsToQuery(
            this.model.find(),
            args,
        ) as MQuery<T[], T>;
        const result = await query.lean(this.options.useLean).exec();
        return result as unknown as T[];
    }

    public async countByArgs(
        args: IMongooseQueryParams,
        config?: any,
    ): Promise<number> {
        if (!this.model) {
            throw Error('You must specify the model to query!');
        }
        args = args || {};
        config = config || {};
        const count = await this.model
            .find(args.where)
            .countDocuments();
        return count;
    }

    public async findOneByArgs(
        args: IMongooseQueryParams,
        config?: any,
    ): Promise<T> {
        if (!this.model) {
            throw Error('You must specify the model to query!');
        }
        args = args || {};
        config = config || {};
        const query = this.addArgsToQuery(
            this.model.findOne(),
            config,
        ) as MQuery<T | null, T>;

        const result = await query.lean(this.options.useLean).exec();
        return result as T;
    }

    public async get<RType = T>(config?: any): Promise<RType[]> {
        return this.findByArgs(await this.parse(config), config) as unknown as RType[];
    }

    public async getOne<RType = T>(config?: any, defaultVal?: RType): Promise<RType> {
        return this.findOneByArgs(await this.parse(config), config) as unknown as RType;
    }

    public async count(config?: any): Promise<number> {
        return this.countByArgs(await this.parse(config), config);
    }

    protected populate(args: IIncludeQueryParams): any {
        return {
            path: args.name,
            select: args.attributes,
            model: args.modelName,
            match: args.where,
            options: { limit: args.take, skip: args.skip },
            populate: args.include
                ? args.include.map(include => this.populate(include))
                : null,
        };
    }

    protected addArgsToQuery(
        query: MQuery<T[], T> | MQuery<T | null, T>,
        args: IMongooseQueryParams,
    ): MQuery<T[], T> | MQuery<T | null, T> {


        query
            .select(args.attributes)
            .limit(args.take || 0)
            .skip(args.skip || 0)
            .sort(args.order)
            .where(args.where || {});

        if (args.include) {
            args.include.map(i => {
                query.populate(this.populate(i));
            });
        }
        return query;
    }

}