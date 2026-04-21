import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { syncDb, Book, Character, Chapter, Realm, Setting, Reference } from './db';

const app = express();
const PORT = Number(process.env.PORT) || 3002;

app.use(cors());
app.use(express.json());

// 初始化数据库
syncDb();

// AI Setup
const getOpenAIClient = async () => {
  let setting: any = await Setting.findOne();
  if (!setting) {
    setting = await Setting.create({
      llmProvider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      apiKey: ''
    });
  }
  return new OpenAI({
    apiKey: setting.apiKey || process.env.OPENAI_API_KEY || '',
    baseURL: setting.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    timeout: 600000, // 设置后端 OpenAI 客户端的超时时间为 10 分钟
  });
};

// Books API
app.get('/api/books', async (req, res) => {
  console.log('111111111111111');
  const books = await Book.findAll();
  res.json(books);
});

app.post('/api/books', async (req, res) => {
   console.log('22222222222222');
  try {
    const newBook = await Book.create(req.body);
    res.json(newBook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create book' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  console.log('3333333333333333');
  const book = await Book.findByPk(req.params.id);
  if (book) res.json(book);
  else res.status(404).json({ error: 'Book not found' });
});

app.put('/api/books/:id', async (req, res) => {
  console.log('444444444444444444');
  const book = await Book.findByPk(req.params.id);
  if (book) {
    await book.update(req.body);
    res.json(book);
  } else {
    res.status(404).json({ error: 'Book not found' });
  }
});

// Characters API
app.get('/api/characters', async (req, res) => {
  console.log('55555555555555');
  const { bookId } = req.query;
  const chars = bookId ? await Character.findAll({ where: { bookId: bookId as string } }) : await Character.findAll();
  res.json(chars);
});

app.post('/api/characters', async (req, res) => {
   console.log('6666666666666666');
  try {
    const newChar = await Character.create(req.body);
    res.json(newChar);
  } catch (error) {
    console.error('Create character error:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

app.put('/api/characters/:id', async (req, res) => {
   console.log('77777777777777777');
  const char = await Character.findByPk(req.params.id);
  if (char) {
    await char.update(req.body);
    res.json(char);
  } else {
    res.status(404).json({ error: 'Character not found' });
  }
});

app.delete('/api/characters/:id', async (req, res) => {
  const char = await Character.findByPk(req.params.id);
  if (char) {
    await char.destroy();
    res.json(char);
  } else {
    res.status(404).json({ error: 'Character not found' });
  }
});

// Chapters API
app.get('/api/chapters', async (req, res) => {
   console.log('8888888888888888888');
  const { bookId } = req.query;
  const chapters = bookId ? await Chapter.findAll({ where: { bookId: bookId as string }, order: [['chapter', 'ASC']] }) : await Chapter.findAll();
  res.json(chapters);
});

app.post('/api/chapters', async (req, res) => {
   console.log('999999999999999999');
  try {
    const newChapter = await Chapter.create(req.body);
    res.json(newChapter);
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

app.put('/api/chapters/:id', async (req, res) => {
  const chapter = await Chapter.findByPk(req.params.id);
  if (chapter) {
    await chapter.update(req.body);
    res.json(chapter);
  } else {
    res.status(404).json({ error: 'Chapter not found' });
  }
});

app.delete('/api/chapters/:id', async (req, res) => {
  const chapter = await Chapter.findByPk(req.params.id);
  if (chapter) {
    await chapter.destroy();
    res.json(chapter);
  } else {
    res.status(404).json({ error: 'Chapter not found' });
  }
});
// Realms API (境界)
app.get('/api/realms', async (req, res) => {
  const { bookId } = req.query;
  const realmsList = bookId ? await Realm.findAll({ where: { bookId: bookId as string }, order: [['level', 'ASC']] }) : await Realm.findAll();
  res.json(realmsList);
});

app.post('/api/realms', async (req, res) => {
  try {
    const newRealm = await Realm.create(req.body);
    res.json(newRealm);
  } catch (error) {
    console.error('Create realm error:', error);
    res.status(500).json({ error: 'Failed to create realm' });
  }
});

app.put('/api/realms/:id', async (req, res) => {
  const realm = await Realm.findByPk(req.params.id);
  if (realm) {
    await realm.update(req.body);
    res.json(realm);
  } else {
    res.status(404).json({ error: 'Realm not found' });
  }
});

app.delete('/api/realms/:id', async (req, res) => {
  const realm = await Realm.findByPk(req.params.id);
  if (realm) {
    await realm.destroy();
    res.json(realm);
  } else {
    res.status(404).json({ error: 'Realm not found' });
  }
});

// Settings API
app.get('/api/settings', async (req, res) => {
  let setting = await Setting.findOne();
  if (!setting) {
    setting = await Setting.create({
      llmProvider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      apiKey: ''
    });
  }
  res.json(setting);
});

app.put('/api/settings', async (req, res) => {
  let setting = await Setting.findOne();
  if (setting) {
    await setting.update(req.body);
  } else {
    setting = await Setting.create(req.body);
  }
  res.json(setting);
});

// References API (资料室)
app.get('/api/references', async (req, res) => {
  const { bookId } = req.query;
  const references = bookId ? await Reference.findAll({ where: { bookId: bookId as string } }) : await Reference.findAll();
  res.json(references);
});

app.post('/api/references', async (req, res) => {
  try {
    const newRef = await Reference.create(req.body);
    res.json(newRef);
  } catch (error) {
    console.error('Create reference error:', error);
    res.status(500).json({ error: 'Failed to create reference' });
  }
});

app.delete('/api/references/:id', async (req, res) => {
  const ref = await Reference.findByPk(req.params.id);
  if (ref) {
    await ref.destroy();
    res.json(ref);
  } else {
    res.status(404).json({ error: 'Reference not found' });
  }
});

// AI Generation API
app.post('/api/writing/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt, maxTokens = 1000 } = req.body;
    const openai = await getOpenAIClient();
    const setting: any = await Setting.findOne();
    const model = setting?.model || 'gpt-3.5-turbo';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful AI writing assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
    });

    res.json({ text: response.choices[0].message.content });
  } catch (error: any) {
    console.error('AI Gen Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate text' });
  }
});

app.post('/api/writing/generate-stream', async (req, res) => {
  console.log('[DEBUG] /api/writing/generate-stream called');
  try {
    const { prompt, systemPrompt, maxTokens = 8192 } = req.body;
    console.log('[DEBUG] Payload:', { promptLength: prompt?.length, systemPrompt, maxTokens });
    
    console.log('[DEBUG] Getting OpenAI Client...');
    const openai = await getOpenAIClient();
    
    console.log('[DEBUG] Getting Settings from DB...');
    const setting: any = await Setting.findOne();
    const model = setting?.dataValues?.model || setting?.model || 'gpt-3.5-turbo';
    console.log('[DEBUG] Using Model:', model);

    console.log('[DEBUG] Requesting OpenAI Chat Completions...');
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful AI writing assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      stream: true,
    });
    console.log('[DEBUG] Received response stream from OpenAI');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let chunkCount = 0;
    for await (const chunk of response) {
      chunkCount++;
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }
    console.log('[DEBUG] Stream finished. Total chunks:', chunkCount);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('[DEBUG] AI Gen Stream Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to generate text' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Failed to generate text' })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`服务已启动，监听端口 ${PORT}`);
});
