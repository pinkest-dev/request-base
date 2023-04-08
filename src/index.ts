import got, { Headers, OptionsOfTextResponseBody } from "got";
import { HttpsProxyAgent } from 'hpagent';
import { ConstructorOptions, Cookie } from "./interfaces.js";
import settings from "./settings.js";

class RequestBase {
    private cookies: { [domen: string]: { [cookieName: string]: Cookie } } = {};
    private proxy: string | null;
    private timeout: number;
    private userAgent: string;
    private defaultHeaders?: Headers;

    constructor(options?: ConstructorOptions) {
        this.proxy = options ? (options.proxy ? options.proxy : null) : null;
        this.userAgent = options && options.userAgent ? options.userAgent : settings.defaultUserAgent;
        this.timeout = options?.timeout || settings.timeout;
        this.defaultHeaders = options?.defaultHeaders;
    }

    public setCookies(domen: string, cookies: { [cookieName: string]: Cookie }) {
        this.cookies[domen] = cookies;
    }
    public getAllDomens() {
        return Object.keys(this.cookies);
    }
    public getCookies(domen?: string) {
        if (domen)
            return this.cookies[domen];
        else return this.cookies;
    }
    public clearCookies(domen?: string) {
        if (typeof (domen) === 'undefined')
            this.cookies = {};
        else
            delete (this.cookies[domen]);
    }
    /**Метод для превращения объекта красивых куков в строку, которую можно уже использовать в запросе */
    protected static PackCookiesToString(cookies: { [cookieName: string]: Cookie }) {
        let result = ``;
        for (const cookieName in cookies) {
            const cookie = cookies[cookieName];
            result += `${cookieName}=${cookie.value}; `;
        }
        return result;
    }
    protected static ParseCookiseString(cookieStr: string) {
        const splittedCookies = cookieStr.split('; ');
        let cookies: { [cookieName: string]: Cookie } = {};
        for (var str of splittedCookies) {
            const splittedCookie = str.split('=');
            if (splittedCookie.length === 2) {
                cookies[splittedCookie[0]] = {
                    name: splittedCookie[0],
                    value: splittedCookie[1],
                    expires: null
                };
            }
        }
        return cookies;
    }
    /**Метод для превращения строки куков в объект
     * Важное примечание: строка, которая передается в метод должна содержать лишь одну куку и её свойства (вызывается, когда приходят куки в set-cookie)
    */
    protected static ParseNewCookiesString(cookieStr: string): Cookie {
        const splittedCookies = cookieStr.split('; ');
        const expiresCookie = splittedCookies.filter(c => c.includes('Expires'))[0];

        const cookie: Cookie = {
            name: splittedCookies[0].split('=')[0],
            value: splittedCookies[0].split('=')[1],
            expires: expiresCookie ? new Date(expiresCookie.split('=')[1]) : null
        }
        return cookie;
    }
    /**Установка массива куков, куки должны браться из set-cookie */
    protected setDirtyCookies(domen: string, cookies: string[]) {
        for (const cookie of cookies) {
            const parsedCookie = RequestBase.ParseNewCookiesString(cookie);
            if (!this.cookies[domen]) this.cookies[domen] = {};
            this.cookies[domen][parsedCookie.name] = parsedCookie;
        }
    }
    /**Универсальная функция для запроса */
    protected async doRequest(url: string, requestOptions?: OptionsOfTextResponseBody, options?: {
        /**Ответ сервера в формате json? */
        isJsonResult?: boolean,
        /**Использовать ли прокси, установленный в конструкторе класса? Если параметр не передается, то прокси используется */
        useDefaultProxy?: boolean,
        /**Использовать ли сохраненные в оперативной памяти куки? */
        useSavedCookies?: boolean,
        /**Использовать ли на этот запрос отдельный прокси? Этот параметр перекрывает дефолтный прокси */
        customProxy?: string
    }) {
        try {
            const domen = url.replaceAll('http://', '').replaceAll('https://', '').split('/')[0];
            const headers = requestOptions?.headers ? { ...this.defaultHeaders, ...requestOptions.headers } : { ...this.defaultHeaders };
            const cookies = requestOptions && requestOptions.headers && requestOptions.headers.cookie ? RequestBase.ParseCookiseString(requestOptions.headers.cookie as string) : {};
            delete (requestOptions?.headers);
            const allCookies = { ...this.cookies[domen], ...cookies };
            const actualRequestOptions: OptionsOfTextResponseBody = {
                headers: {
                    cookie: options?.useSavedCookies === false ? undefined : RequestBase.PackCookiesToString(allCookies),
                    'User-Agent': this.userAgent,
                    ...headers
                },
                timeout: {
                    request: this.timeout
                },
                ...requestOptions
            }

            if (options?.customProxy) {
                actualRequestOptions.agent = {
                    https: this.getProxyAgent(options.customProxy),
                    http: this.getProxyAgent(options.customProxy)
                }
            } else if (this.proxy && (options?.useDefaultProxy || typeof (options) === 'undefined'))
                actualRequestOptions.agent = {
                    https: this.getProxyAgent(this.proxy),
                    http: this.getProxyAgent(this.proxy)
                }
            const result = await got(url, actualRequestOptions).then((response) => {
                const { body, statusCode } = response;
                //got type trouble
                //@ts-ignore
                const headers = response.headers as any;
                const newCookies = headers["set-cookie"];
                const cookiesToDelete = headers[""];
                if (newCookies) this.setDirtyCookies(domen, newCookies);
                if (options?.isJsonResult === true || typeof (options?.isJsonResult) === 'undefined') {
                    try {
                        return { headers, body: JSON.parse(body), requestOptions: actualRequestOptions };
                    } catch (err) {
                        throw new Error(`Cant parse response. It's not in json format`);
                    }
                } else {
                    return { headers, body, statusCode: statusCode, requestOptions: actualRequestOptions };
                }
            }).catch(err => {
                if (err.response)
                    if (options?.isJsonResult === true || typeof (options?.isJsonResult) === 'undefined') {
                        try {
                            return { headers: err.response.headers, body: JSON.parse(err.response.body), statusCode: err.statusCode, requestOptions: actualRequestOptions };
                        } catch (err){
                            throw new Error(`Cant parse response. It's not in json format`);
                        }
                    } else {
                        return { headers: err.response.headers, body: err.response.body, statusCode: err.statusCode, requestOptions: actualRequestOptions };
                    }
                else {
                        throw new Error(err);
                    }
            });
            return result;
        } catch (err) {
            throw new Error(`Request error: ${err}`);
        }
    }
    private getProxyAgent(proxy: string) {
        return new HttpsProxyAgent({
            proxy: proxy
        });
    }
}

export default RequestBase;