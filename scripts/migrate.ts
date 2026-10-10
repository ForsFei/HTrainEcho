import { migrate } from '../src/lib/db';
migrate();
console.log('SQLite migration complete');
