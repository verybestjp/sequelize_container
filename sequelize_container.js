const Sequelize = (process.env.SEQUELIZE5 ? require('sequelize5') : require('sequelize4'));

// TODO: operatorsAliasesを削除
const Op = Sequelize.Op;
const operatorsAliases = {
  $eq: Op.eq,
  $ne: Op.ne,
  $gte: Op.gte,
  $gt: Op.gt,
  $lte: Op.lte,
  $lt: Op.lt,
  $not: Op.not,
  $in: Op.in,
  $notIn: Op.notIn,
  $is: Op.is,
  $like: Op.like,
  $notLike: Op.notLike,
  $iLike: Op.iLike,
  $notILike: Op.notILike,
  $regexp: Op.regexp,
  $notRegexp: Op.notRegexp,
  $iRegexp: Op.iRegexp,
  $notIRegexp: Op.notIRegexp,
  $between: Op.between,
  $notBetween: Op.notBetween,
  $overlap: Op.overlap,
  $contains: Op.contains,
  $contained: Op.contained,
  $adjacent: Op.adjacent,
  $strictLeft: Op.strictLeft,
  $strictRight: Op.strictRight,
  $noExtendRight: Op.noExtendRight,
  $noExtendLeft: Op.noExtendLeft,
  $and: Op.and,
  $or: Op.or,
  $any: Op.any,
  $all: Op.all,
  $values: Op.values,
  $col: Op.col
};

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
      benchmark: !!(db_config.logging || process.env.VERBOSE),
      dialectOptions: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        ssl: db_config.ssl ? 'Amazon RDS': false,
        // v3.28.0 から updateのaffected_rowsの挙動が変わっていて、
        // 値の変更がない場合に0が返ってくるため、その挙動をOFFにする。
        // https://github.com/sequelize/sequelize/issues/7184
        // https://github.com/sequelize/sequelize/pull/7423/files
        flags: '',
        // v4からSUMなどの集計関数の結果が文字列で返ってきてしまうため、
        // 従来通り数値で返ってくるようにする
        // @see https://github.com/sequelize/sequelize/issues/8019#issuecomment-319014433
        decimalNumbers: true,
      },
    };
    if (process.env.SEQUELIZE5) {
      options.operatorsAliases = operatorsAliases;
    }

    delete options.dialectOptions.collate;

    options.pool = {
      max: db_config.pool_max_connections || 5,
      idle: db_config.pool_max_idle_time || 5000,
    };

    return options;
  }

  static get(db_config) {
    const ident = SequelizeContainer.getIdent(db_config);

    if (process.env.SEQUELIZE5) {
      if (!container[ident]) {
        const options = SequelizeContainer._getOption(db_config);
        const newObject = new Sequelize(db_config.database, db_config.user, db_config.password, options);
        newObject.table = {}; // sequelizeのテーブルオブジェクトを保持

        container[ident] = {};
        ['options', 'config', 'dialect', 'queryInterface', 'connectionManager'].forEach((key) => {
          container[ident][key] = newObject[key];
        });

        if (!SequelizeContainer.object) {
          SequelizeContainer.object = newObject;
        }
      }
      Object.assign(SequelizeContainer.object, container[ident]);
      return SequelizeContainer.object;
    }

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

// Sequelizeオブジェクト
SequelizeContainer.lib = Sequelize;

SequelizeContainer.object = null;

module.exports = SequelizeContainer;
