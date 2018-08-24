const Sequelize = require('sequelize');

let container = {};
class SequelizeContainer {
  static get(db_config) {
    let ident = String(db_config.host) + ':' + String(db_config.database);
    if (container[ident]) {
      return container[ident];
    }
    container[ident] = new Sequelize(db_config.database, db_config.user, db_config.password, {
      host: db_config.host || process.env.MYSQL_PORT_3306_TCP_ADDR || 'mysql',
      pool: {
        maxConnections: 10,
        maxIdleTime: 30
      },
      retry: {
        match: [
          Sequelize.ConnectionError
        ],
        max: 5,
      },
      dialect: 'mysql',
      logging: db_config.logging || process.env.VERBOSE ? console.log : false,
      dialectOptions: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        ssl: db_config.ssl ? 'Amazon RDS': false,
      },
    });
    container[ident].table = {}; // sequelizeのテーブルオブジェクトを保持
    return container[ident];
  }
}
module.exports = SequelizeContainer;
