import { toKebabCase } from './stringUtils';
import path from 'path';
import fg from 'fast-glob';
import type { Express } from 'express';
import { appWinston } from '../../config/logger/appWinston';

export async function loadRoutes(app: Express) {
    const modulesPath = path.resolve(__dirname, '../../modules');
    const routeFiles = await fg('**/**.routes.{ts,js}', {
        cwd: modulesPath,
        absolute: true,
    });
    console.log(routeFiles);

    for (const file of routeFiles) {
        try {
            const moduleRoutes = await import(path.resolve(file));

            if (moduleRoutes.default) {
                let routePath = path
                    .relative(modulesPath, path.dirname(file))
                    .split(path.sep)
                    .join('/');
                const router = moduleRoutes.default;

                if (!router.stack || router.stack.length === 0) continue;

                routePath = toKebabCase(routePath);

                app.use(`/${routePath}`, router);

                // 🚀 Logowanie z pełnym rozbiciem metod HTTP
                router.stack.forEach((layer: any) => {
                    if (layer.route) {
                        const methods = Object.keys(layer.route.methods)
                            .map((method) => `[${method.toUpperCase()}]`)
                            .join(', ');
                        const fullPath = path
                            .join('/', routePath, layer.route.path)
                            .replace(/\/$/, '');
                        appWinston.info(`Registering ${methods} ${fullPath}`);
                    }
                });

                appWinston.info('--------------------------------------------------------');
            }
        } catch (e) {
            console.log(e);
        }
    }
}
