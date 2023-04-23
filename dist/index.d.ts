import { Headers, OptionsOfTextResponseBody } from "got";
import { ConstructorOptions, Cookie } from "./interfaces.js";
declare class RequestBase {
    private cookies;
    private proxy;
    private timeout;
    private userAgent;
    private defaultHeaders?;
    constructor(options?: ConstructorOptions);
    setProxy(proxy: string): void;
    setCookies(domen: string, cookies: {
        [cookieName: string]: Cookie;
    }): void;
    getAllDomens(): string[];
    getAllCookies(): {
        [domen: string]: {
            [cookieName: string]: Cookie;
        };
    };
    getCookies(domen: string): {
        [cookieName: string]: Cookie;
    };
    clearCookies(domen?: string): void;
    /**Метод для превращения объекта красивых куков в строку, которую можно уже использовать в запросе */
    protected static PackCookiesToString(cookies: {
        [cookieName: string]: Cookie;
    }): string;
    protected static ParseCookiseString(cookieStr: string): {
        [cookieName: string]: Cookie;
    };
    /**Метод для превращения строки куков в объект
     * Важное примечание: строка, которая передается в метод должна содержать лишь одну куку и её свойства (вызывается, когда приходят куки в set-cookie)
    */
    protected static ParseNewCookiesString(cookieStr: string): Cookie;
    /**Установка массива куков, куки должны браться из set-cookie */
    protected setDirtyCookies(domen: string, cookies: string[]): void;
    doRequest(url: string, requestOptions?: OptionsOfTextResponseBody, options?: {
        /**Ответ сервера в формате json? */
        isJsonResult?: boolean;
        /**Использовать ли прокси, установленный в конструкторе класса? Если параметр не передается, то прокси используется */
        useDefaultProxy?: boolean;
        /**Использовать ли сохраненные в оперативной памяти куки? */
        useSavedCookies?: boolean;
        /**Использовать ли на этот запрос отдельный прокси? Этот параметр перекрывает дефолтный прокси */
        customProxy?: string;
        /**Время, после которого функция вернет ошибку */
        customTimeout?: number;
    }): Promise<{
        body: any;
        headers: Headers;
        statusCode?: number;
        requestOptions: OptionsOfTextResponseBody;
    }>;
    /**Универсальная функция для запроса */
    protected _doRequest(url: string, requestOptions?: OptionsOfTextResponseBody, options?: {
        /**Ответ сервера в формате json? */
        isJsonResult?: boolean;
        /**Использовать ли прокси, установленный в конструкторе класса? Если параметр не передается, то прокси используется */
        useDefaultProxy?: boolean;
        /**Использовать ли сохраненные в оперативной памяти куки? */
        useSavedCookies?: boolean;
        /**Использовать ли на этот запрос отдельный прокси? Этот параметр перекрывает дефолтный прокси */
        customProxy?: string;
    }): Promise<{
        headers: any;
        body: any;
        requestOptions: OptionsOfTextResponseBody;
        statusCode?: undefined;
    } | {
        headers: any;
        body: string;
        statusCode: number;
        requestOptions: OptionsOfTextResponseBody;
    } | {
        headers: any;
        body: any;
        statusCode: any;
        requestOptions: OptionsOfTextResponseBody;
    }>;
    private getProxyAgent;
}
export default RequestBase;
