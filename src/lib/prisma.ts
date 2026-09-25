import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient();
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

if (process.env.DATABASE_URL) {
    prisma.$connect()
        .then(() => {
            console.log('✅ Database linked with success!');
        })
        .catch((error) => {
            console.warn('Database unavailable, continuing with mock-data fallbacks:', error instanceof Error ? error.message : String(error));
        });
} else {
    console.warn('DATABASE_URL not configured; continuing with mock-data fallbacks.');
}
