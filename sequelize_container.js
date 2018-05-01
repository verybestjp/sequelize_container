const Sequelize = require('sequelize');

class SequelizeContainer {
  static get(config) {
    if (config.sequelize) {
      return config.sequelize;
    }
    config.sequelize = new Sequelize(config.db.database, config.db.user, config.db.password, {
      host: config.db.host || process.env.MYSQL_PORT_3306_TCP_ADDR || 'mysql',
      pool: {
        maxConnections: 10,
        maxIdleTime: 30
      },
      dialect: 'mysql',
      logging: config.db.logging || process.env.VERBOSE ? console.log : false,
      dialectOptions: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        ssl: config.db.ssl ? 'Amazon RDS': false,
      },
    });
    config.sequelize.table = {}; // sequelizeのテーブルオブジェクトを保持
    return config.sequelize;
  }
}
module.exports = SequelizeContainer;
