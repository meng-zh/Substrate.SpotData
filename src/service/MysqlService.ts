import config from '../config/common.json';
const mysql = require('mysql');
const bluebird = require('bluebird');

var pool = mysql.createPool(config.DBConfig);

let getConnection = bluebird.promisify(pool.getConnection, { context: pool });

export async function Connection() {
    let result = await getConnection();
    return new Promise(function (resolve, _reject) {
        resolve(result);
    });
}

export async function Release(connection) {
    return new Promise(function (resolve, _reject) {
        resolve(pool.releaseConnection(connection));
    });
}