import { Sequelize, DataTypes, Model } from 'sequelize';

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
};

export const sequelize = new Sequelize(
  requireEnv('DB_NAME'),
  requireEnv('DB_USER'),
  requireEnv('DB_PASSWORD'),
  {
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false, // 设置为 console.log 可查看执行的 SQL
  }
);

// Book 模型
export class Book extends Model {}
Book.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT('long') },
  outline: { type: DataTypes.TEXT('long') },
  outlineTree: { type: DataTypes.TEXT('long') },
  worldview: { type: DataTypes.TEXT('long') },
}, { sequelize, modelName: 'Book' });

// Character 模型
export class Character extends Model {}
Character.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING },
  personality: { type: DataTypes.TEXT },
  abilities: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING },
}, { sequelize, modelName: 'Character' });

// Chapter 模型
export class Chapter extends Model {}
Chapter.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookId: { type: DataTypes.UUID, allowNull: false },
  volume: { type: DataTypes.INTEGER, defaultValue: 1 },
  chapter: { type: DataTypes.INTEGER, defaultValue: 1 },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT('long') },
  summary: { type: DataTypes.TEXT('long') },
  wordCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.STRING, defaultValue: 'draft' },
  reviewFeedback: { type: DataTypes.TEXT('long') },
}, { sequelize, modelName: 'Chapter' });

// Realm 模型
export class Realm extends Model {}
Realm.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookId: { type: DataTypes.UUID, allowNull: false },
  level: { type: DataTypes.INTEGER },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT('long') },
}, { sequelize, modelName: 'Realm' });

// Reference 模型 (资料室)
export class Reference extends Model {}
Reference.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookId: { type: DataTypes.UUID, allowNull: false },
  sourceName: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT('long') },
}, { sequelize, modelName: 'Reference' });

// Clue 模型 (伏笔/暗线)
export class Clue extends Model {}
Clue.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT('long') },
  status: { type: DataTypes.STRING, defaultValue: 'active' } // active(未回收), resolved(已回收)
}, { sequelize, modelName: 'Clue' });

// Setting 模型 (仅存一条记录)
export class Setting extends Model {}
Setting.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  llmProvider: { type: DataTypes.STRING },
  baseUrl: { type: DataTypes.STRING },
  apiKey: { type: DataTypes.STRING },
  model: { type: DataTypes.STRING },
}, { sequelize, modelName: 'Setting' });

// 建立关联关系
Book.hasMany(Character, { foreignKey: 'bookId', onDelete: 'CASCADE' });
Character.belongsTo(Book, { foreignKey: 'bookId' });

Book.hasMany(Chapter, { foreignKey: 'bookId', onDelete: 'CASCADE' });
Chapter.belongsTo(Book, { foreignKey: 'bookId' });

Book.hasMany(Realm, { foreignKey: 'bookId', onDelete: 'CASCADE' });
Realm.belongsTo(Book, { foreignKey: 'bookId' });

Book.hasMany(Reference, { foreignKey: 'bookId', onDelete: 'CASCADE' });
Reference.belongsTo(Book, { foreignKey: 'bookId' });

Book.hasMany(Clue, { foreignKey: 'bookId', onDelete: 'CASCADE' });
Clue.belongsTo(Book, { foreignKey: 'bookId' });

// 同步数据库
export const syncDb = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    await sequelize.sync({ alter: true }); // 根据模型自动修改表结构
    console.log('Database synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};
