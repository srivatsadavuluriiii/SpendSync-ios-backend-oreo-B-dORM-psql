export namespace swaggerUi {
    function serve(req: any, res: any, next: any): any;
    function setup(docs: any, options: any): (req: any, res: any) => void;
}
export namespace swaggerDocs {
    let openapi: string;
    namespace info {
        let title: string;
        let version: string;
        let description: string;
    }
    let paths: {
        '/api/v1/settlements': {
            get: {
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
    };
}
