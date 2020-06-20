import { ConnectionOptions, getConnection, getMetadataArgsStorage } from "typeorm"

export function getConn(entities: (string|Function)[]): ConnectionOptions {
    return {
        type: "sqlite",
        database: ":memory:",
        dropSchema: true,
        entities: entities,
        synchronize: true,
        logging: false
    }
}

export async function cleanup() {
    let conn = getConnection();
    const storage = getMetadataArgsStorage();
    (storage as any).tables = [];
    (storage as any).columns = [];
    (storage as any).relations = [];
    if (conn.isConnected) {
        // delete all tables
        await conn.synchronize(true)
        await conn.close();
    }
}