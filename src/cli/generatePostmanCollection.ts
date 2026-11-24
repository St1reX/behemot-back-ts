import fs from 'fs';
import path from 'path';
import { apiPort, apiUrl } from '../config/env';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type RequestBody = Record<string, string | number | boolean | string[] | null>;

type ModuleRequestBodies = Record<string, RequestBody> & {
    default?: RequestBody;
};

type PostmanVariable = {
    key: string;
    value: string;
};

type PostmanRequest = {
    method: HttpMethod;
    header: PostmanVariable[];
    url: {
        raw: string;
        host: string[];
        path: string[];
        variable: PostmanVariable[];
        query?: PostmanVariable[];
    };
    body?: {
        mode: 'raw';
        raw: string;
        options: {
            raw: {
                language: 'json';
            };
        };
    };
    auth: {
        type: 'noauth';
    };
};

type PostmanItem = {
    name: string;
    request: PostmanRequest;
    response: [];
    event: PostmanEvent[];
};

type PostmanFolder = {
    name: string;
    item: PostmanItem[];
};

type PostmanEvent = {
    listen: 'test';
    script: {
        type: 'text/javascript';
        exec: string[];
    };
};

type PostmanCollection = {
    info: {
        name: string;
        schema: string;
        description: string;
    };
    item: PostmanFolder[];
    variable: PostmanVariable[];
};

const routeRegex = /router\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/g;

const requestBodies: Record<string, ModuleRequestBodies> = {
    auth: {
        'POST /auth/login': {
            username: 'admin',
            password: 'password123',
        },
        'POST /auth/register': {
            email: 'new-user@example.com',
            password: 'password123',
            username: 'newUser',
        },
        'POST /auth/resend-mail': {
            email: 'new-user@example.com',
        },
    },
    department: {
        default: {
            name: 'Body parts',
            shortcut: 'BP',
        },
    },
    warehouse: {
        default: {
            name: 'Main warehouse',
            postalCode: '00-001',
            city: 'Warsaw',
            street: 'Main Street',
            buildingNumber: '1',
        },
    },
    contractor: {
        default: {
            name: 'Example contractor',
        },
    },
    producer: {
        default: {
            name: 'Example producer',
        },
    },
    carBrand: {
        default: {
            name: 'AUDI',
        },
    },
    carModel: {
        default: {
            name: 'A4',
            carBrandId: '{{carBrandId}}',
        },
    },
    carGeneration: {
        default: {
            startProduction: 2008,
            endProduction: 2015,
            carModelId: '{{carModelId}}',
        },
    },
    productListingTemplate: {
        'POST /product-listing-template/preview': {
            titleTemplate: '{{customName}}',
            summaryTemplate: '<p>{{producer}} | SKU: {{sku}}</p>',
            descriptionTemplate: '<p>{{customName}}</p>',
        },
        default: {
            name: 'Universal shop product template',
            titleTemplate: '{{customName}}',
            summaryTemplate: '{{producer}} | SKU: {{sku}} | Department: {{department}}',
            descriptionTemplate:
                '{{customName}}. Dimensions: {{length}} x {{width}} cm. Warehouse location: {{warehouseLocation}}.',
            departmentId: '{{departmentId}}',
        },
    },
    product: {
        default: {
            imagesUrls: ['https://example.com/product.jpg'],
            descriptionImagesUrls: [],
            price: 34.99,
            quantity: 24,
            customName: 'Boll beige polyurethane adhesive and sealant 310 ml',
            internalNote: 'Example shop product without vehicle fitment',
            side: 'NONE',
            weight: 0.45,
            length: 23.5,
            width: 5,
            height: 5,
            sku: 'BOLL-SEALANT-BEIGE-310',
            ean: '5907588405797',
            oem: ['BOLL-007006'],
            warehouseLocation: 'A-01-02',
            warehouseId: '{{warehouseId}}',
            listingTemplateId: '{{productListingTemplateId}}',
            departmentId: '{{departmentId}}',
            producerId: '{{producerId}}',
        },
    },
    productFitment: {
        default: {
            productId: '{{productId}}',
            carGenerationId: '{{carGenerationId}}',
            isPrimary: false,
        },
    },
    productCrossReference: {
        default: {
            productId: '{{productId}}',
            contractorId: '{{contractorId}}',
            contractorSku: 'CONTRACTOR-SKU',
            contractorEan: null,
        },
    },
    role: {
        default: {
            name: 'custom_role',
            privilegeIds: ['{{privilegeId}}'],
        },
        'POST /role/:id/privileges': {
            privilegeIds: ['{{privilegeId}}'],
        },
        'DELETE /role/:id/privileges': {
            privilegeIds: ['{{privilegeId}}'],
        },
    },
    user: {
        'POST /user': {
            username: 'managedUser', email: 'managed-user@example.com', password: 'password123',
            roleId: '{{roleId}}', isActive: true,
        },
        'PUT /user/:id': {
            username: 'managedUser', email: 'managed-user@example.com',
            roleId: '{{roleId}}', isActive: true,
        },
    },
};

const collectionVariables: PostmanVariable[] = [
    { key: 'baseUrl', value: `${apiUrl}:${apiPort}` },
    { key: 'id', value: '' },
    { key: 'departmentId', value: '' },
    { key: 'warehouseId', value: '' },
    { key: 'contractorId', value: '' },
    { key: 'producerId', value: '' },
    { key: 'carBrandId', value: '' },
    { key: 'carModelId', value: '' },
    { key: 'carGenerationId', value: '' },
    { key: 'productListingTemplateId', value: '' },
    { key: 'productId', value: '' },
    { key: 'productFitmentId', value: '' },
    { key: 'productCrossReferenceId', value: '' },
    { key: 'verificationToken', value: '' },
    { key: 'roleId', value: '' },
    { key: 'privilegeId', value: '' },
    { key: 'userId', value: '' },
    { key: 'auditLogId', value: '' },
];

const createdResourceIdVariables: Record<string, string> = {
    department: 'departmentId',
    warehouse: 'warehouseId',
    contractor: 'contractorId',
    producer: 'producerId',
    carBrand: 'carBrandId',
    carModel: 'carModelId',
    carGeneration: 'carGenerationId',
    productListingTemplate: 'productListingTemplateId',
    product: 'productId',
    productFitment: 'productFitmentId',
    productCrossReference: 'productCrossReferenceId',
    role: 'roleId',
    user: 'userId',
    auditLog: 'auditLogId',
};

function findProjectRoot(startPath: string): string {
    let currentPath = startPath;

    while (!fs.existsSync(path.join(currentPath, 'package.json'))) {
        const parentPath = path.dirname(currentPath);

        if (parentPath === currentPath) {
            throw new Error('Project root could not be found');
        }

        currentPath = parentPath;
    }

    return currentPath;
}

function toKebabCase(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

function getRouteFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return getRouteFiles(entryPath);
        }

        return entry.isFile() && entry.name.endsWith('.routes.ts') ? [entryPath] : [];
    });
}

function normalizeRoutePath(modulePath: string, routePath: string): string {
    const normalizedRoutePath = routePath === '/' ? '' : routePath;

    return `/${modulePath}${normalizedRoutePath}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function getPostmanPathVariableName(moduleName: string, parameterName: string): string {
    if (parameterName === 'id') {
        return createdResourceIdVariables[moduleName] || parameterName;
    }

    return parameterName;
}

function toPostmanPath(moduleName: string, apiPath: string): string {
    return apiPath.replace(/:([A-Za-z0-9_]+)/g, (_match, parameterName: string) => {
        return `{{${getPostmanPathVariableName(moduleName, parameterName)}}}`;
    });
}

function getPathVariables(moduleName: string, apiPath: string): PostmanVariable[] {
    const variables: PostmanVariable[] = [];
    const parameterRegex = /:([A-Za-z0-9_]+)/g;
    let match: RegExpExecArray | null;

    while ((match = parameterRegex.exec(apiPath)) !== null) {
        variables.push({
            key: getPostmanPathVariableName(moduleName, match[1]),
            value: '',
        });
    }

    return variables;
}

function getRequestBody(
    moduleName: string,
    method: HttpMethod,
    apiPath: string,
): RequestBody | null {
    const fullRouteKey = `${method} ${apiPath}`;
    const moduleBodies = requestBodies[moduleName];

    if (!moduleBodies) {
        return null;
    }

    const routeBody = moduleBodies[fullRouteKey];

    if (routeBody) {
        return routeBody;
    }

    return ['POST', 'PUT', 'PATCH'].includes(method) ? moduleBodies.default || null : null;
}

function buildTestEvent(moduleName: string, method: HttpMethod, apiPath: string): PostmanEvent {
    const scriptLines = [
        "pm.test('Response status is successful', function () {",
        '    pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
    ];
    const resourceIdVariable = createdResourceIdVariables[moduleName];

    if (method === 'POST' && resourceIdVariable && apiPath === `/${toKebabCase(moduleName)}`) {
        scriptLines.push(
            '',
            'if (pm.response.code >= 200 && pm.response.code < 300) {',
            '    const response = pm.response.json();',
            `    pm.collectionVariables.set('${resourceIdVariable}', response.id);`,
            '}',
        );
    }

    return {
        listen: 'test',
        script: {
            type: 'text/javascript',
            exec: scriptLines,
        },
    };
}

function buildRequestItem(moduleName: string, method: HttpMethod, apiPath: string): PostmanItem {
    const postmanPath = toPostmanPath(moduleName, apiPath);
    const requestBody = getRequestBody(moduleName, method, apiPath);
    const headers: PostmanVariable[] = [];

    if (requestBody) {
        headers.push({
            key: 'Content-Type',
            value: 'application/json',
        });
    }

    const request: PostmanRequest = {
        method,
        header: headers,
        url: {
            raw: `{{baseUrl}}${postmanPath}`,
            host: ['{{baseUrl}}'],
            path: postmanPath.split('/').filter(Boolean),
            variable: getPathVariables(moduleName, apiPath),
        },
        auth: {
            type: 'noauth',
        },
    };

    if (apiPath === '/auth/verify-account') {
        request.url.raw = '{{baseUrl}}/auth/verify-account?token={{verificationToken}}';
        request.url.query = [
            {
                key: 'token',
                value: '{{verificationToken}}',
            },
        ];
    }

    if (requestBody) {
        request.body = {
            mode: 'raw',
            raw: JSON.stringify(requestBody, null, 4),
            options: {
                raw: {
                    language: 'json',
                },
            },
        };
    }

    return {
        name: `${method} ${apiPath}`,
        request,
        response: [],
        event: [buildTestEvent(moduleName, method, apiPath)],
    };
}

function buildCollection(modulesPath: string): PostmanCollection {
    const routeFiles = getRouteFiles(modulesPath).sort();

    const folders = routeFiles.map((routeFile) => {
        const moduleName = path.basename(path.dirname(routeFile));
        const modulePath = path.relative(modulesPath, path.dirname(routeFile)).split(path.sep).map(toKebabCase).join('/');
        const fileContent = fs.readFileSync(routeFile, 'utf8');
        const routes: PostmanItem[] = [];
        let match: RegExpExecArray | null;

        routeRegex.lastIndex = 0;

        while ((match = routeRegex.exec(fileContent)) !== null) {
            const method = match[1].toUpperCase() as HttpMethod;
            const routePath = match[2];
            const apiPath = normalizeRoutePath(modulePath, routePath);

            routes.push(buildRequestItem(moduleName, method, apiPath));
        }

        return {
            name: modulePath,
            item: routes,
        };
    });

    folders.push({ name: 'operations', item: [buildRequestItem('operations', 'GET', '/metrics')] });

    return {
        info: {
            name: 'Behemot API',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            description: 'Log in using POST /auth/login. Postman must retain and send the behemot-api-sid session cookie using its cookie jar. The API does not accept Bearer tokens. Set resource ID variables before using dependent requests. Product listing placeholders such as {{customName}} are literal template syntax; leave those Postman variables undefined.',
        },
        item: folders.filter((folder) => folder.item.length > 0),
        variable: collectionVariables,
    };
}

const projectRoot = findProjectRoot(__dirname);
const modulesPath = path.join(projectRoot, 'src', 'modules');
const outputPath = path.join(projectRoot, 'postman', 'behemot-api.postman_collection.json');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(buildCollection(modulesPath), null, 4)}\n`);

console.log(`Postman collection generated: ${path.relative(projectRoot, outputPath)}`);
