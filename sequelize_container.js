const Sequelize = (process.env.SEQUELIZE4 ? require('sequelize4') : require('sequelize'));

const container = {};

class SequelizeContainer {
  static get(db_config) {
    const ident = String(db_config.host) + ':' + String(db_config.database);
    if (container[ident]) {
      return container[ident];
    }

    const options = {
      host: db_config.host || process.env.MYSQL_PORT_3306_TCP_ADDR || 'mysql',
      pool: {},
      retry: {
        match: [
          /getaddrinfo EAI_AGAIN/
        ],
        max: 2,
      },
      dialect: 'mysql',
      logging: db_config.logging || process.env.VERBOSE ? console.log : false,
      dialectOptions: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        ssl: db_config.ssl ? 'Amazon RDS': false,
        // v3.28.0 から updateのaffected_rowsの挙動が変わっていて、
        // 値の変更がない場合に0が返ってくるため、その挙動をOFFにする。
        // https://github.com/sequelize/sequelize/issues/7184
        // https://github.com/sequelize/sequelize/pull/7423/files
        flags: '',
      },
    };

    if (process.env.SEQUELIZE4) {
      options.pool = {
        max: db_config.pool_max_connections || 10,
        idle: db_config.pool_max_idle_time || 30000,
      };
    } else {
      options.pool = {
        maxConnections: db_config.pool_max_connections || 10,
        maxIdleTime: db_config.pool_max_idle_time || 30000,
      };
    }

    container[ident] = new Sequelize(db_config.database, db_config.user, db_config.password, options);

    container[ident].table = {}; // sequelizeのテーブルオブジェクトを保持

    return container[ident];
  }
}
module.exports = SequelizeContainer;
