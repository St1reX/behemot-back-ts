import { prisma } from '../../../config/database';

const departments = [
    { shortcut: 'B', name: 'Błotniki' },
    { shortcut: 'SS', name: 'StefanStanley' },
    { shortcut: 'P', name: 'Progi' },
    { shortcut: 'O', name: 'Opaski' },
];

async function main() {
    const createdCount = await prisma.$transaction(async (transaction) => {
        let created = 0;

        for (const department of departments) {
            const existing = await transaction.department.findMany({
                where: {
                    deletedAt: null,
                    OR: [{ shortcut: department.shortcut }, { name: department.name }],
                },
                select: { name: true, shortcut: true },
            });

            if (existing.length === 1
                && existing[0].name === department.name
                && existing[0].shortcut === department.shortcut) {
                continue;
            }

            if (existing.length > 0) {
                throw new Error(`Konflikt nazwy lub skrótu działu ${department.shortcut} — ${department.name}.`);
            }

            await transaction.department.create({ data: department });
            created++;
        }

        return created;
    });

    console.log(`Dodano ${createdCount} działów. Pominięto ${departments.length - createdCount} istniejących.`);
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
