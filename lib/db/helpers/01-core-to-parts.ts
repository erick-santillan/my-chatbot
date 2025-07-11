import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('Message migration script is not required for MongoDB.');
process.exit(0);
