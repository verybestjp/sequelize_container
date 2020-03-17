const Sequelize = (process.env.SEQUELIZE4 ? require('sequelize4') : require('sequelize'));

const container = {};

class SequelizeContainer {
  static getIdent(conf) {
    return `${ conf.host }:${ conf.database }`;
  }

  static _getOption(db_config) {
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
      delete options.dialectOptions.collate;

      options.pool = {
        max: db_config.pool_max_connections || 5,
        idle: db_config.pool_max_idle_time || 5000,
      };
    } else {
      options.pool = {
        maxConnections: db_config.pool_max_connections || 5,
        maxIdleTime: db_config.pool_max_idle_time || 5000,
      };
    }

    return options;
  }

  static get(db_config) {
    const ident = SequelizeContainer.getIdent(db_config);
    if (container[ident]) {
      return container[ident];
    }

    const options = SequelizeContainer._getOption(db_config);

    container[ident] = new Sequelize(db_config.database, db_config.user, db_config.password, options);

    container[ident].table = {}; // sequelizeのテーブルオブジェクトを保持

    return container[ident];
  }

  /**
   * DB接続を切断する
   */
  static close(conf) {
    const ident = SequelizeContainer.getIdent(conf);
    if (!container[ident]) {
      return;
    }

    container[ident].close();
    delete container[ident];
  }

  /**
   * poolしない接続用のDB connection取得
   */
  static getConnection(db_config) {
    const options = SequelizeContainer._getOption(db_config);
    const ret = new Sequelize(db_config.database, db_config.user, db_config.password, options);
    ret.table = {}; // sequelizeのテーブルオブジェクトを保持

    return ret;
  }

  /**
   * poolしない接続用のDB切断
   */
  static closeConnection(sequelize) {
    return sequelize.close();
  }
}
module.exports = SequelizeContainer;
