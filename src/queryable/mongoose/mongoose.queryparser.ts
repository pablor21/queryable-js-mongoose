import { ICondition, IIncludeQuery, IIncludeQueryParams, IQuery, IQueryParser } from "@pablor21/queryable-js";
import { IMongooseQueryParams } from "./mongoose.queryparams";


// map sequelize operators to local enum operators
const operatorsAliases = {
    eq: {
        op: '$eq',
        func: (value: any) => {
            return {
                ...value,
                op: '$eq',
            };
        },
    },
    neq: {
        op: '$ne',
        func: (value: any) => {
            return {
                ...value,
                op: '$ne',
            };
        },
    },
    gte: '$gte',
    gt: '$gt',
    lte: '$lte',
    lt: '$lt',
    notIs: '$neq',
    in: '$in',
    notIn: '$nin',
    startsWith: {
        op: '$regex',
        func: (value: any) => {
            return new RegExp(`^${value}`, 'i');
        },
    },
    sw: {
        op: '$regex',
        func: (value: any) => {
            return new RegExp(`^${value}`, 'i');
        },
    },
    endsWith: {
        op: '$regex',
        func: (value: any) => {
            return new RegExp(`${value}$`, 'i');
        },
    },
    ew: {
        op: '$regex',
        func: (value: any) => {
            return new RegExp(`${value}$`, 'i');
        },
    },
    cn: {
        op: '$regex',
        func: (value: any) => {
            return new RegExp(`${value}`, 'i');
        },
    },
    contains: {
        op: '$regex',
        func: (value: any) => {
            return new RegExp(`${value}`, 'i');
        },
    },
    notContains: {
        op: '$not',
        func: (value: any) => {
            return new RegExp(`${value}`, 'i');
        },
    },
    nc: {
        op: '$not',
        func: (value: any) => {
            return new RegExp(`${value}`, 'i');
        },
    },
    iLike: {
        op: '$regex',
        func: (value: any) => {
            return new RegExp(`${value}/`, 'i');
        },
    },
    notILike: {
        op: '$not',
        func: (value: any) => {
            return new RegExp(`${value}/`, 'i');
        },
    },
    regexp: {
        op: '$regex',
        func: (value: string | RegExp) => {
            return new RegExp(value, 'i');
        },
    },
    notRegexp: {
        op: '$not',
        func: (value: any) => {
            return new RegExp(`${value}`, 'i');
        },
    },
    iRegexp: {
        op: '$regex',
        func: (value: any) => {
            return new RegExp(`${value}`, 'i');
        },
    },
    notIRegexp: {
        op: '$not',
        func: (value: any) => {
            return new RegExp(`${value}/`, 'i');
        },
    },
    between: {
        func: (value: any[]) => {
            return { $gte: value[0], $lte: value[1] };
        },
        ignoreOp: true,
    },
    notBetween: {
        func: (value: any[]) => {
            return { $lt: value[0], $gt: value[1] };
        },
        ignoreOp: true,
    },
    and: '$and',
    or: '$or',
    not: '$not',
};

export class MongooseQueryParser implements IQueryParser {

    public async parse(query: IQuery, config?: any): Promise<IMongooseQueryParams> {
        const params: IMongooseQueryParams = {};

        params.where = await this.parseConditions(query.conditions) || {};
        params.order = await this.parseSorts(query, query.orderBy);
        params.include = await this.parseIncludes(query.include);
        if (params.order) {
            params.order = params.order.join(' ');
        }

        params.attributes = query.attributes;
        // params.include = query.include;
        params.take = query.take;
        params.skip = query.skip;


        return params;
    }

    public async parseIncludes(includes?: IIncludeQuery[]): Promise<IIncludeQueryParams[]> {
        const ret: IIncludeQueryParams[] = [];
        if (includes) {
            await Promise.all(includes.map(async i => {
                if (i.name) {
                    const p = {
                        name: i.name,
                        type: i.type,
                        modelName: i.type,
                    } as IIncludeQueryParams;
                    const parsedFilterParams = await i.filter?.parse() || {};
                    Object.assign(p, parsedFilterParams);
                    ret.push(p);
                }
            }));
        }
        return ret;
    }

    public async parseSorts(filter: IQuery, sort?: string[]): Promise<string[] | undefined> {
        return sort && sort.length > 0 ? sort : undefined;
    }

    public async parseConditions(condition?: ICondition) {
        let where: any = {};

        if (condition) {
            if (condition.field) {
                where = await this.parseSingleCondition(condition);
            }
            if (condition.and || condition.or || condition.not) {
                if (condition.and) {
                    if (Array.isArray(condition.and)) {
                        let and: any[] = [];
                        await Promise.all(
                            condition.and.map(async c => {
                                and.push(await this.parseConditions(c));
                            }),
                        );
                        and = and.filter(o => o != null);
                        if (and.length > 0) {
                            where[operatorsAliases.and] = and;
                        }


                    } else {

                        where[operatorsAliases.and] = await this.parseSingleCondition(
                            condition.and,
                        );
                    }
                }


                if (condition.or) {
                    if (Array.isArray(condition.or)) {
                        let or: any[] = [];
                        await Promise.all(
                            condition.or.map(async c => {
                                or.push(await this.parseConditions(c));
                            }),
                        );
                        or = or.filter(o => o != null);
                        if (or.length > 0) {
                            where[operatorsAliases.or] = or;
                        }
                    } else {
                        where[operatorsAliases.or] = await this.parseSingleCondition(
                            condition.or,
                        );
                    }
                }
                if (condition.not) {
                    if (Array.isArray(condition.not)) {
                        let not: any[] = [];
                        await Promise.all(
                            condition.not.map(async c => {
                                not.push(await this.parseConditions(c));
                            }),
                        );
                        not = not.filter(o => o != null);
                        if (not.length > 0) {
                            where[operatorsAliases.not] = not;
                        }
                    } else {
                        where[operatorsAliases.not] = await this.parseSingleCondition(
                            condition.not,
                        );
                    }

                }
            }
        }
        return where;
    }

    public async parseSingleCondition(condition: ICondition): Promise<any> {
        let op: any = condition.op
            // @ts-ignore
            ? operatorsAliases[condition.op]
            : operatorsAliases.eq;
        if (!op) {
            return null;
        }

        let { field, value } = condition;

        if (field === 'id') {
            field = '_id';
        }
        if (op.func) {
            value = op.func(value);
        }
        if (op.op) {
            op = op.op;
        }

        if (value.op !== undefined) {
            op = value.op;
        }

        if (value.value) {
            value = value.value;
        }

        if (op.ignoreOp) {
            op = null;
        }

        if (undefined !== field && undefined !== value) {
            const ret = {
                [field]: op
                    ? {
                        [op]: value,
                    }
                    : value,
            };
            return ret;
        }

        return null;
    }

}