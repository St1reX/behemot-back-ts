import { appWinston } from '../../config/logger/appWinston';

interface GracefulShutdownTask {
    name: string;
    close: () => Promise<unknown>;
}

interface GracefulShutdownOptions {
    processName: string;
    tasks: GracefulShutdownTask[];
}

export function setupGracefulShutdown({ processName, tasks }: GracefulShutdownOptions) {
    let isShuttingDown = false;

    async function shutdown(signal: NodeJS.Signals) {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        appWinston.info(`Received ${signal}, shutting down ${processName}`);

        const failedTasks: string[] = [];

        for (const task of tasks) {
            try {
                await task.close();
            } catch (error) {
                failedTasks.push(task.name);
                appWinston.error(
                    `Error while closing ${task.name}: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                );
            }
        }

        if (failedTasks.length > 0) {
            process.exitCode = 1;
        }
    }

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        process.on(signal, () => {
            void shutdown(signal);
        });
    }
}
