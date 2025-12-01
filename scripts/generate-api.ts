import * as fs from 'fs';
import * as path from 'path';

const API_ROOT = path.join(process.cwd(), 'app', 'api');
const SERVICES_ROOT = path.join(process.cwd(), 'app', 'services');

// Type mappings configuration
const TYPE_MAPPINGS: Record<string, { import: string; type: string; bodyType?: string }> = {
    products: {
        import: "import type { Product } from '@/const/types';",
        type: 'Product',
        bodyType: 'Partial<Product>',
    },
    packages: {
        import: "import type { Package } from '@/app/admin/dashboard/packages/types';",
        type: 'Package',
        bodyType: 'Partial<Package>',
    },
    pricing: {
        import: "import type { PricingConfig } from '@/const/types';",
        type: 'PricingConfig',
        bodyType: 'PricingConfig',
    },
};

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Helper to singularize
const singularize = (s: string) => {
    if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
    if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
    return s;
};

const generateFunctionName = (method: string, segments: string[], hasId: boolean) => {
    const lastSegment = segments[segments.length - 1];
    const parentSegment = segments.length > 1 ? segments[segments.length - 2] : '';
    const verb = method.toLowerCase();

    if (['import', 'export', 'upload', 'login', 'logout', 'register'].includes(lastSegment)) {
        const target = parentSegment ? capitalize(parentSegment) : '';
        return `${lastSegment}${target}`;
    }

    if (hasId) {
        const noun = singularize(lastSegment || 'Item');
        if (verb === 'get') return `get${capitalize(noun)}`;
        if (verb === 'put') return `update${capitalize(noun)}`;
        if (verb === 'delete') return `delete${capitalize(noun)}`;
        return `${verb}${capitalize(noun)}`;
    } else {
        const noun = lastSegment;
        if (verb === 'get') return `get${capitalize(noun)}`;
        if (verb === 'post') return `create${capitalize(singularize(noun))}`;
        if (verb === 'put') return `update${capitalize(noun)}`;
        return `${verb}${capitalize(noun)}`;
    }
};

interface ApiRoute {
    method: string;
    url: string;
    functionName: string;
    hasId: boolean;
    paramName?: string;
    resource: string; // e.g., 'products', 'packages'
}

const routes: ApiRoute[] = [];

function walkDir(dir: string, callback: (filePath: string) => void) {
    fs.readdirSync(dir).forEach((f) => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

// 1. Scan Routes
if (fs.existsSync(API_ROOT)) {
    walkDir(API_ROOT, (filePath) => {
        if (!filePath.endsWith('route.ts')) return;

        const relativePath = path.relative(API_ROOT, filePath);
        const pathSegments = relativePath.split(path.sep);
        pathSegments.pop(); // remove 'route.ts'

        // Identify Resource (first segment)
        const resource = pathSegments[0];

        // Determine URL and Params
        let url = '/api';
        let hasId = false;
        let paramName = '';
        const cleanSegments: string[] = [];

        pathSegments.forEach((seg) => {
            if (seg.startsWith('[') && seg.endsWith(']')) {
                hasId = true;
                paramName = seg.slice(1, -1);
                url += '/${' + paramName + '}';
            } else {
                url += `/${seg}`;
                cleanSegments.push(seg);
            }
        });

        const content = fs.readFileSync(filePath, 'utf-8');
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

        methods.forEach((method) => {
            if (
                content.includes(`export async function ${method}`) ||
                content.includes(`export function ${method}`)
            ) {
                const functionName = generateFunctionName(method, cleanSegments, hasId);
                routes.push({
                    method,
                    url,
                    functionName,
                    hasId,
                    paramName,
                    resource,
                });
            }
        });
    });
}

// 2. Group by Resource
const routesByResource: Record<string, ApiRoute[]> = {};
routes.forEach((route) => {
    if (!routesByResource[route.resource]) {
        routesByResource[route.resource] = [];
    }
    routesByResource[route.resource].push(route);
});

// 3. Generate Files
if (!fs.existsSync(SERVICES_ROOT)) {
    fs.mkdirSync(SERVICES_ROOT, { recursive: true });
}

Object.entries(routesByResource).forEach(([resource, resourceRoutes]) => {
    const mapping = TYPE_MAPPINGS[resource];
    const resourceType = mapping ? mapping.type : 'any';
    const bodyType = mapping ? mapping.bodyType || 'any' : 'any';

    let code = `/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';\n`;
    if (mapping) {
        code += `${mapping.import}\n`;
    }
    code += `\n`;
    resourceRoutes.sort((a, b) => a.functionName.localeCompare(b.functionName));

    resourceRoutes.forEach((route) => {
        const { method, url, functionName, hasId, paramName } = route;

        const params: string[] = [];
        if (hasId && paramName) {
            params.push(`${paramName}: string | number`);
        }

        // Default Generic Types
        let returnType = 'any';
        let requestType = 'any';
        const queryType = 'any';

        if (method === 'GET') {
            // Try to infer return type for list vs detail
            if (hasId) {
                returnType = resourceType; // Detail
            } else {
                returnType = `${resourceType}[]`; // List
            }
            params.push(`params?: ${queryType}`);
        } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
            requestType = bodyType;
            returnType = resourceType; // Assuming create/update returns the object
            params.push(`data: ${requestType}`);
        }

        // Function signature
        code += `export const ${functionName} = (${params.join(', ')}) => {\n`;

        let axiosCall = `    return api.${method.toLowerCase()}<any, ${returnType}>(\`${url}\``;

        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            axiosCall += `, data`;
        } else if (method === 'GET') {
            axiosCall += `, { params }`;
        }

        code += `${axiosCall});\n};\n\n`;
    });

    const fileName = path.join(SERVICES_ROOT, `${resource}.ts`);
    fs.writeFileSync(fileName, code);
    console.log(`Generated ${fileName}`);
});

// 4. Generate Index
const indexContent = Object.keys(routesByResource)
    .map((resource) => `export * from './${resource}';`)
    .join('\n');

fs.writeFileSync(path.join(SERVICES_ROOT, 'index.ts'), indexContent);
console.log(`Generated ${path.join(SERVICES_ROOT, 'index.ts')}`);
