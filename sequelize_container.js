const Sequelize = require('sequelize');

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
  static get lib() {
    return Sequelize;
  }

  static getIdent(conf, isSlave) {
    return `${ conf.host }:${ conf.database }:${ isSlave ? '1' : '0' }`;
  }

  static _getOption(dbConfig, isSlave) {
    let host = dbConfig.host;
    if (dbConfig.host_slave && isSlave) {
      host = dbConfig.host_slave;
    }
    const options = {
      host: host || process.env.MYSQL_PORT_3306_TCP_ADDR || 'mysql',
      pool: {},
      retry: {
        match: [
          /getaddrinfo EAI_AGAIN/
        ],
        max: 2,
      },
      dialect: 'mysql',
      logging: dbConfig.logging || process.env.VERBOSE ? console.log : false,
      benchmark: !!(dbConfig.logging || process.env.VERBOSE),
      operatorsAliases: operatorsAliases,
      dialectOptions: {
        charset: 'utf8mb4',
        ssl: dbConfig.ssl ? 'Amazon RDS': false,
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
      pool: {
        max: dbConfig.max ?? 5, // 利用者数が多い事務所は20に設定する
        idle: 5000,
        acquire: 10000,
        // evict はデフォルトの1000 msec
      },
    };

    return options;
  }

  static getSlave(dbConfig) {
    return SequelizeContainer.get(dbConfig, true);
  }

  static get(dbConfig, isSlave = false) {
    const ident = SequelizeContainer.getIdent(dbConfig, isSlave);
    if (container[ident]) {
      return container[ident];
    }

    const options = SequelizeContainer._getOption(dbConfig, isSlave);


    container[ident] = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, options);

    // sequelizeのテーブルオブジェクトを保持
    container[ident].table = {};

    // 読み込みが完了しているテーブル定義のディレクトリ
    container[ident].loaded_dir = {};

    // 読み込みが完了していないassociation
    container[ident].association = new Map();

    return container[ident];
  }

  /**
   * DB接続を切断する
   */
  static close(conf) {
    const ident = SequelizeContainer.getIdent(conf);
    if (!container[ident]) {
      return Promise.resolve();
    }

    return container[ident].close().then(() => {
      delete container[ident];
    });
  }

  /**
   * poolしない接続用のDB connection取得
   */
  static getConnection(dbConfig) {
    const options = SequelizeContainer._getOption(dbConfig);
    const ret = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, options);

    // sequelizeのテーブルオブジェクトを保持
    ret.table = {};

    // 読み込みが完了しているテーブル定義のディレクトリ
    ret.loaded_dir = {};

    // 読み込みが完了していないassociation
    ret.association = new Map();

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
