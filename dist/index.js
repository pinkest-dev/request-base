import got from "got";
import { HttpsProxyAgent } from 'hpagent';
import settings from "./settings.js";
class RequestBase {
    cookies = {};
    proxy;
    timeout;
    userAgent;
    defaultHeaders;
    constructor(options) {
        this.proxy = options ? (options.proxy ? options.proxy : null) : null;
        this.userAgent = options && options.userAgent ? options.userAgent : settings.defaultUserAgent;
        this.timeout = options?.timeout || settings.timeout;
        this.defaultHeaders = options?.defaultHeaders;
    }
    setProxy(proxy) {
        this.proxy = proxy;
    }
    setCookies(domen, cookies) {
        this.cookies[domen] = cookies;
    }
    getAllDomens() {
        return Object.keys(this.cookies);
    }
    getAllCookies() {
        return this.cookies;
    }
    getCookies(domen) {
        return this.cookies[domen];
    }
    clearCookies(domen) {
        if (typeof (domen) === 'undefined')
            this.cookies = {};
        else
            delete (this.cookies[domen]);
    }
    /**Метод для превращения объекта красивых куков в строку, которую можно уже использовать в запросе */
    static PackCookiesToString(cookies) {
        let result = ``;
        for (const cookieName in cookies) {
            const cookie = cookies[cookieName];
            result += `${cookieName}=${cookie.value}; `;
        }
        return result;
    }
    static ParseCookiseString(cookieStr) {
        const splittedCookies = cookieStr.split('; ');
        let cookies = {};
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
    static ParseNewCookiesString(cookieStr) {
        const splittedCookies = cookieStr.split('; ');
        const expiresCookie = splittedCookies.filter(c => c.includes('Expires'))[0];
        const cookie = {
            name: splittedCookies[0].split('=')[0],
            value: splittedCookies[0].split('=')[1],
            expires: expiresCookie ? new Date(expiresCookie.split('=')[1]) : null
        };
        return cookie;
    }
    /**Установка массива куков, куки должны браться из set-cookie */
    setDirtyCookies(domen, cookies) {
        for (const cookie of cookies) {
            const parsedCookie = RequestBase.ParseNewCookiesString(cookie);
            if (!this.cookies[domen])
                this.cookies[domen] = {};
            this.cookies[domen][parsedCookie.name] = parsedCookie;
        }
    }
    async doRequest(url, requestOptions, options) {
        return new Promise(async (resolve, reject) => {
            setTimeout(reject, options?.customTimeout || this.timeout);
            this._doRequest(url, requestOptions, options).then(data => {
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        });
    }
    /**Универсальная функция для запроса */
    async _doRequest(url, requestOptions, options) {
        try {
            const domen = url.replaceAll('http://', '').replaceAll('https://', '').split('/')[0];
            const headers = requestOptions?.headers ? { ...this.defaultHeaders, ...requestOptions.headers } : { ...this.defaultHeaders };
            const cookies = requestOptions && requestOptions.headers && requestOptions.headers.cookie ? RequestBase.ParseCookiseString(requestOptions.headers.cookie) : {};
            delete (requestOptions?.headers);
            const allCookies = { ...this.cookies[domen], ...cookies };
            const actualRequestOptions = {
                headers: {
                    cookie: options?.useSavedCookies === false ? undefined : RequestBase.PackCookiesToString(allCookies),
                    'User-Agent': this.userAgent,
                    ...headers
                },
                ...requestOptions
            };
            if (options?.customProxy) {
                actualRequestOptions.agent = {
                    https: this.getProxyAgent(options.customProxy),
                    http: this.getProxyAgent(options.customProxy)
                };
            }
            else if (this.proxy && (options?.useDefaultProxy || typeof (options) === 'undefined'))
                actualRequestOptions.agent = {
                    https: this.getProxyAgent(this.proxy),
                    http: this.getProxyAgent(this.proxy)
                };
            const result = await got(url, actualRequestOptions).then((response) => {
                const { body, statusCode } = response;
                //got type trouble
                //@ts-ignore
                const headers = response.headers;
                const newCookies = headers["set-cookie"];
                const cookiesToDelete = headers[""];
                if (newCookies)
                    this.setDirtyCookies(domen, newCookies);
                if (options?.isJsonResult === true || typeof (options?.isJsonResult) === 'undefined') {
                    try {
                        return { headers, body: JSON.parse(body), requestOptions: actualRequestOptions };
                    }
                    catch (err) {
                        throw new Error(`Cant parse response. It's not in json format`);
                    }
                }
                else {
                    return { headers, body, statusCode: statusCode, requestOptions: actualRequestOptions };
                }
            }).catch(err => {
                if (err.response)
                    if (options?.isJsonResult === true || typeof (options?.isJsonResult) === 'undefined') {
                        try {
                            return { headers: err.response.headers, body: JSON.parse(err.response.body), statusCode: err.statusCode, requestOptions: actualRequestOptions };
                        }
                        catch (err) {
                            throw new Error(`Cant parse response. It's not in json format`);
                        }
                    }
                    else {
                        return { headers: err.response.headers, body: err.response.body, statusCode: err.statusCode, requestOptions: actualRequestOptions };
                    }
                else {
                    throw new Error(err);
                }
            });
            return result;
        }
        catch (err) {
            throw new Error(`Request error: ${err}`);
        }
    }
    getProxyAgent(proxy) {
        return new HttpsProxyAgent({
            proxy: proxy
        });
    }
}
export default RequestBase;
