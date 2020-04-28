import { LitElement, html } from 'lit-element';
import { AmfHelperMixin } from '@api-components/amf-helper-mixin/amf-helper-mixin.js';
import markdownStyles from '@advanced-rest-client/markdown-styles/markdown-styles.js';
import labelStyles from '@api-components/http-method-label/http-method-label-common-styles.js';
import sanitizer from 'dompurify/dist/purify.es.js';
import '@api-components/raml-aware/raml-aware.js';
import '@advanced-rest-client/arc-marked/arc-marked.js';
import '@polymer/iron-meta/iron-meta.js';
import styles from './Styles.js';
/**
 * `api-summary`
 *
 * A summary view for an API base on AMF data model
 *
 * ## Styling
 *
 * `<api-summary>` provides the following custom properties and mixins for styling:
 *
 * Custom property | Description | Default
 * ----------------|-------------|----------
 * `--api-summary` | Mixin applied to this elment | `{}`
 * `--api-summary-color` | Color of text labels | ``
 * `--api-summary-url-font-size` | Font size of endpoin URL | `16px`
 * `--api-summary-url-background-color` | Background color of the URL section | `#424242`
 * `--api-summary-url-font-color` | Font color of the URL area | `#fff`
 * `--api-summary-separator-color` | Color of section separator | `rgba(0, 0, 0, 0.12)`
 *
 * @customElement
 * @demo demo/index.html
 * @appliesMixin AmfHelperMixin
 */
export class ApiSummary extends AmfHelperMixin(LitElement) {
  get styles() {
    return [
      markdownStyles,
      labelStyles,
      styles,
    ];
  }

  static get properties() {
    return {
      /**
       * `raml-aware` scope property to use.
       */
      aware: { type: String },
      /**
       * A property to set to override AMF's model base URI information.
       * When this property is set, the `endpointUri` property is recalculated.
       */
      baseUri: { type: String, value: '' },
      /**
       * API title header level in value range from 1 to 6.
       * This is made for accessibility. It the component is used in a context
       * where headers order matters then this property is to be set to
       * arrange headers in the right order.
       *
       * @default 2
       */
      titleLevel: { type: String },
      /**
       * Enables automatic rearranging of endpoints after being  computed
       */
      rearrangeendpoints: { type: Boolean },

      _providerName: { type: String },
      _providerEmail: { type: String },
      _providerUrl: { type: String },
      _licenseName: { type: String },
      _licenseUrl: { type: String },
      _endpoints: { type: Array },
      _termsOfService: { type: String },
      _version: { type: String },
      _apiTitle: { type: String },
      _description: { type: String },
      _protocols: { type: Array }
    };
  }

  // get baseUri() {
  //   return this._baseUri;
  // }
  //
  // set baseUri(value) {
  //   const old = this._baseUri;
  //   /* istanbul ignore if */
  //   if (old === value) {
  //     return;
  //   }
  //   this._baseUri = value;
  //   // this._apiBaseUri = this._computeBaseUri(this.server, value, this.protocols);
  //   this.requestUpdate('baseUri', old);
  // }

  // get _protocols() {
  //   return this.__protocols;
  // }
  //
  // set _protocols(value) {
  //   const old = this.__protocols;
  //   /* istanbul ignore if */
  //   if (old === value) {
  //     return;
  //   }
  //   this.__protocols = value;
  //   this._apiBaseUri = this._computeBaseUri(this.server, this.baseUri, value);
  //   this.requestUpdate('_protocols', old);
  // }

  constructor() {
    super();
    this.titleLevel = 2;
  }

  __amfChanged() {
    if (this.__amfProcessingDebouncer) {
      return;
    }
    this.__amfProcessingDebouncer = true;
    setTimeout(() => this._processModelChange());
  }

  _processModelChange() {
    this.__amfProcessingDebouncer = false;
    const { amf } = this;
    if (!amf) {
      return;
    }

    this.servers = this._getServers({});
    const webApi = this.webApi = this._computeWebApi(amf);
    this._protocols = this._computeProtocols(amf);

    this._webApiChanged(webApi);
  }

  _webApiChanged(webApi) {
    if (!webApi) {
      return;
    }

    this._apiTitle = this._computeApiTitle(webApi);
    this._description = this._computeDescription(webApi);
    this._version = this._computeVersion(webApi);
    this._termsOfService = this._computeToS(webApi);
    this._endpoints = this._computeEndpoints(webApi);

    const provider = this._computeProvider(webApi);
    this._providerName = this._computeName(provider);
    this._providerEmail = this._computeEmail(provider);
    this._providerUrl = this._computeUrl(provider);

    const license = this._computeLicense(webApi);
    this._licenseName = this._computeName(license);
    this._licenseUrl = this._computeUrl(license);
  }

  /**
   * Computes value of `apiTitle` property.
   *
   * @param {Object} shape Shape of AMF model.
   * @return {String|undefined} Description if defined.
   */
  _computeApiTitle(shape) {
    return this._getValue(shape, this.ns.aml.vocabularies.core.name);
  }
  /**
   * Computes value for `version` property
   * @param {Object} webApi AMF's WebApi shape
   * @return {String|undefined}
   */
  _computeVersion(webApi) {
    return this._getValue(webApi, this.ns.aml.vocabularies.core.version);
  }
  /**
   * Computes API's URI based on `amf` and `baseUri` property.
   *
   * @param {Object} server Server model of AMF API.
   * @param {?String} baseUri Current value of `baseUri` property
   * @param {?Array<String>} protocols List of supported protocols
   * @return {String} Endpoint's URI
   */
  _computeBaseUri(server, baseUri, protocols) {
    let base = this._getBaseUri(baseUri, server, protocols);
    if (base && base[base.length - 1] === '/') {
      base = base.substr(0, base.length - 1);
    }
    return base;
  }
  /**
   * Computes information about provider of the API.
   *
   * @param {Object} webApi WebApi shape
   * @return {Object|undefined}
   */
  _computeProvider(webApi) {
    if (!webApi) {
      return;
    }
    const key = this._getAmfKey(this.ns.aml.vocabularies.core.provider);
    let data = this._ensureArray(webApi[key]);
    if (!data) {
      return;
    }
    data = data[0];
    if (data instanceof Array) {
      data = data[0];
    }
    return data;
  }

  _computeName(provider) {
    return this._getValue(provider, this.ns.aml.vocabularies.core.name);
  }

  _computeEmail(provider) {
    return this._getValue(provider, this.ns.aml.vocabularies.core.email);
  }

  _computeUrl(provider) {
    let value = this._getValue(provider, this.ns.aml.vocabularies.core.url);
    if (!value && provider) {
      const key = this._getAmfKey(this.ns.aml.vocabularies.core.url);
      const data = provider[key];
      if (data) {
        value = data instanceof Array ? data[0]['@id'] : data['@id'];
      }
    }
    return value;
  }

  _computeToS(webApi) {
    return this._getValue(webApi, this.ns.aml.vocabularies.core.termsOfService);
  }

  _computeLicense(webApi) {
    const key = this._getAmfKey(this.ns.aml.vocabularies.core.license);
    const data = webApi && webApi[key];
    if (!data) {
      return;
    }
    return data instanceof Array ? data[0] : data;
  }
  /**
   * Computes view model for endpoints list.
   * @param {Object} webApi Web API model
   * @return {Array<Object>|undefined}
   */
  _computeEndpoints(webApi) {
    if (!webApi) {
      return;
    }
    const key = this._getAmfKey(this.ns.aml.vocabularies.apiContract.endpoint);
    let endpoints = this._ensureArray(webApi[key]);
    if (!endpoints || !endpoints.length) {
      return;
    }
    if (this.rearrangeendpoints) {
      endpoints = this._rearrangeEndpoints(endpoints);
    }
    return endpoints.map((item) => {
      const result = {
        name: this._getValue(item, this.ns.aml.vocabularies.core.name),
        path: this._getValue(item, this.ns.aml.vocabularies.apiContract.path),
        id: item['@id'],
        ops: this._endpointOperations(item)
      };
      return result;
    });
  }
  /**
   * Computes a view model for supported operations for an endpoint.
   * @param {Object} endpoint Endpoint model.
   * @return {Array<Object>|unbdefined}
   */
  _endpointOperations(endpoint) {
    const key = this._getAmfKey(this.ns.aml.vocabularies.apiContract.supportedOperation);
    const so = this._ensureArray(endpoint[key]);
    if (!so || !so.length) {
      return;
    }
    return so.map((item) => {
      return {
        id: item['@id'],
        method: this._getValue(item, this.ns.aml.vocabularies.apiContract.method)
      };
    });
  }

  _navigateItem(e) {
    e.preventDefault();
    const data = e.composedPath()[0].dataset;
    if (!data.id || !data.shapeType) {
      return;
    }
    const ev = new CustomEvent('api-navigation-selection-changed', {
      bubbles: true,
      composed: true,
      detail: {
        selected: data.id,
        type: data.shapeType
      }
    });
    this.dispatchEvent(ev);
  }

  _apiHandler(e) {
    this.amf = e.target.api;
  }

  render() {
    const { aware } = this;
    return html`<style>${this.styles}</style>
      ${aware ?
        html`<raml-aware @api-changed="${this._apiHandler}" .scope="${aware}"></raml-aware>` :
        ''}

      <div>
        ${this._titleTemplate()}
        ${this._versionTemplate()}
        ${this._descriptionTemplate()}
        ${this._serversTemplate()}
        ${this._protocolsTemplate()}
        ${this._contactInfoTemplate()}
        ${this._licenseTemplate()}
        ${this._termsOfServiceTemplate()}
      </div>

      ${this._endpointsTemplate()}
    `;
  }

  _titleTemplate() {
    const { _apiTitle, titleLevel } = this;
    if (!_apiTitle) {
      return '';
    }
    return html`
    <div class="api-title" role="heading" aria-level="${titleLevel}">
    <label>API title:</label>
    <span>${_apiTitle}</span>
    </div>`;
  }

  _versionTemplate() {
    const { _version } = this;
    if (!_version) {
      return '';
    }
    return html`
    <p class="inline-description version">
      <label>Version:</label>
      <span>${_version}</span>
    </p>`;
  }

  _descriptionTemplate() {
    const { _description } = this;
    if (!_description) {
      return '';
    }
    return html`
    <div role="region" class="marked-description">
      <arc-marked .markdown="${_description}" sanitize>
        <div slot="markdown-html" class="markdown-body"></div>
      </arc-marked>
    </div>`;
  }

  /**
   * @param {Object} server Server definition
   * @return {TemplateResult|String} A template for a server, servers, or no servers
   * whether it's defined in the main API definition or not.
   */
  _serversTemplate() {
    const { servers } = this;
    if (!servers || !servers.length) {
      return '';
    }
    if (servers.length === 1) {
      return this._baseUriTemplate(servers[0]);
    }

    return html`
    <div class="servers" slot="markdown-html">
      <p class="servers-label">API servers</p>
      <ul class="server-lists">
      ${servers.map((server) => this._serverListTemplate(server))}
      </ul>
    </div>`;
  }

  /**
   * @param {Object} server Server definition
   * @return {TemplateResult} Template for a server list items when there is more
   * than one server.
   */
  _serverListTemplate(server) {
    const { baseUri, protocols } = this;
    const uri = this._computeBaseUri(server, baseUri, protocols);
    return html`<li>${uri}</li>`;
  }

  /**
   * @param {Object} server Server definition
   * @return {TemplateResult} A template for a single server in the main API definition
   */
  _baseUriTemplate(server) {
    const { baseUri, protocols } = this;
    const uri = this._computeBaseUri(server, baseUri, protocols);
    return html`
    <div class="url-area">
      <span class="url-label">API base URI</span>
      <div class="url-value">${uri}</div>
    </div>`;
  }

  _protocolsTemplate() {
    const { _protocols } = this;
    if (!_protocols || !_protocols.length) {
      return '';
    }
    const result = _protocols.map((item) => html`<span class="chip">${item}</span>`);

    return html`
    <label class="section">Supported protocols</label>
    <div class="protocol-chips">${result}</div>`;
  }

  _contactInfoTemplate() {
    const { _providerName, _providerEmail, _providerUrl } = this;
    if (!_providerName) {
      return '';
    }
    return html`
    <section role="contentinfo" class="docs-section">
      <label class="section">Contact information</label>
      <p class="inline-description">
        <span class="provider-name">${_providerName}</span>
        ${_providerEmail ? html`<a
            class="app-link link-padding provider-email"
            href="mailto:${_providerEmail}">${_providerEmail}</a>` : ''}
      </p>
      ${_providerUrl ? html([`
        <p class="inline-description">
          ${this._sanitizeHTML(
            `<a href="${_providerUrl}" target="_blank" class="app-link provider-url">${_providerUrl}</a>`,
          )}
        </p>`]) : ''}
    </section>`;
  }

  _licenseTemplate() {
    const { _licenseUrl, _licenseName } = this;
    if (!_licenseUrl || !_licenseName) {
      return '';
    }
    return html([`
    <section role="region" aria-labelledby="licenseLabel" class="docs-section">
      <label class="section" id="licenseLabel">License</label>
      <p class="inline-description">
        ${this._sanitizeHTML(
          `<a href="${_licenseUrl}" target="_blank" class="app-link">${_licenseName}</a>`,
        )}
      </p>
    </section>`]);
  }

  _termsOfServiceTemplate() {
    const { _termsOfService } = this;
    if (!_termsOfService || !_termsOfService.length) {
      return '';
    }
    return html`
    <section role="region" aria-labelledby="tocLabel" class="docs-section">
      <label class="section" id="tocLabel">Terms of service</label>
      <arc-marked .markdown="${_termsOfService}" sanitize>
        <div slot="markdown-html" class="markdown-body"></div>
      </arc-marked>
    </section>`;
  }

  _endpointsTemplate() {
    const { _endpoints } = this;
    if (!_endpoints || !_endpoints.length) {
      return;
    }
    const result = _endpoints.map((item) => this._endpointTemplate(item));
    return html`
    <div class="separator"></div>
    <div class="toc">
      <label class="section endpoints-title">API endpoints</label>
      ${result}
    </div>
    `;
  }

  _endpointTemplate(item) {
    const ops = item.ops && item.ops.length ? item.ops.map((op) => this._methodTemplate(op, item)) : '';
    return html`
    <div class="endpoint-item" @click="${this._navigateItem}">
      ${item.name ? this._endpointNameTemplate(item) : this._endpointPathTemplate(item)}
      <div class="endpoint-header">
        ${ops}
      </div>
    </div>`;
  }

  _endpointPathTemplate(item) {
    return html`
    <a
      class="endpoint-path"
      href="#${item.path}"
      data-id="${item.id}"
      data-shape-type="endpoint"
      title="Open endpoint documentation">${item.path}</a>
    `;
  }

  _endpointNameTemplate(item) {
    if (!item.name) {
      return '';
    }
    return html`
    <a
      class="endpoint-path"
      href="#${item.path}"
      data-id="${item.id}"
      data-shape-type="endpoint"
      title="Open endpoint documentation">${item.name}</a>
    <p class="endpoint-path-name">${item.path}</p>
    `;
  }

  _methodTemplate(item, endpoint) {
    return html`
      <a
        href="#${endpoint.path + '/' + item.method}"
        class="method-label"
        data-method="${item.method}"
        data-id="${item.id}"
        data-shape-type="method"
        title="Open method documentation">${item.method}</a>
    `;
  }

  _sanitizeHTML(HTML) {
    const result = sanitizer.sanitize(HTML, { ADD_ATTR: ['target'] });

    if (typeof result === 'string') {
      return result;
    }

    return result.toString();
  }

    /**
   * Re-arrange the endpoints in relative order to each other, keeping
   * the first endpoints to appear first, and the last endpoints to appear
   * last
   * @param {Array} endpoints
   * @return {Array}
   */
  _rearrangeEndpoints(endpoints) {
    if (!endpoints) {
      return null;
    }

    const merge = (left, right) => {
      const resultArray = [];
      let leftIndex = 0;
      let rightIndex = 0;

      while (leftIndex < left.length && rightIndex < right.length) {
        const leftPath = this._getValue(left[leftIndex], this.ns.raml.vocabularies.apiContract.path)
        const rightPath = this._getValue(right[rightIndex], this.ns.raml.vocabularies.apiContract.path)
        if (leftPath < rightPath) {
          resultArray.push(left[leftIndex]);
          leftIndex++;
        } else {
          resultArray.push(right[rightIndex]);
          rightIndex++;
        }
      }

      return resultArray.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
    }

    const mergeSort = (unsortedArray) => {
      if (unsortedArray.length <= 1) {
        return unsortedArray;
      }
      const middle = Math.floor(unsortedArray.length / 2);

      const left = unsortedArray.slice(0, middle);
      const right = unsortedArray.slice(middle);

      return merge(mergeSort(left), mergeSort(right));
    }

    const listMap = this._createListMap(endpoints);

    return Object.keys(listMap)
      .map((key) => mergeSort(listMap[key]))
      .reduce((acc, value) => acc.concat(value), []);
  }
    /**
   * Transforms a list of endpoints into a map that goes from
   * string -> Object[], representing the first part of the endpoint
   * path, and the list of endpoints that match it. The idea is
   * to have a map for this, respecting the order each
   * endpoint is first found at, so that re-arranging the
   * endpoints keeps them in the same relative order to each
   * other
   *
   * @param {Array} endpoints
   * @return {Array}
   */
  _createListMap(endpoints) {
    const map = {};
    const getPathInit = (endpoint) => {
      return this._getValue(endpoint, this.ns.raml.vocabularies.apiContract.path).split('/')[1];
    };
    endpoints.forEach((endpoint) => {
      const pathInit = getPathInit(endpoint);
      if (map[pathInit]) {
        map[pathInit].push(endpoint);
      } else {
        map[pathInit] = [endpoint];
      }
    });
    return map;
  }
}
