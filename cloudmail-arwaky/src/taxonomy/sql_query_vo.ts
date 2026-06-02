// taxonomy/sql_query_vo.ts
// Branded type for SQL query strings

/** SQL query string */
export type SqlQuery = string & { readonly __brand: 'SqlQuery' };

export function asSqlQuery(s: string): SqlQuery {
    if (typeof s !== 'string' || s.trim().length === 0) throw new Error('SQL query cannot be empty');
    return s as SqlQuery;
}
