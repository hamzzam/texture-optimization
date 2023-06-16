
class DRACOModuleLoader {
    // Global Draco decoder.
    decoderModule = {};
    dracoDecoderType = {
        wasmBinaryFile: null
    };

    encoderModule = {};
    dracoEncoderType = {
        wasmBinaryFile: null
    };

    // It is recommended to always pull your Draco JavaScript and WASM decoders
    // from this URL. Users will benefit from having the Draco decoder in cache
    // as more sites start using the static URL.
    decoderPath = './';
    encoderPath = './';

    constructor() {
    }

    // This function loads a JavaScript file and adds it to the page. "path" is
    // the path to the JavaScript file. "onLoadFunc" is the function to be called
    // when the JavaScript file has been loaded.
    loadJavaScriptFile(path, onLoadFunc) {
        const head = document.getElementsByTagName('head')[0];
        const element = document.createElement('script');
        element.type = 'text/javascript';
        element.src = path;
        if (onLoadFunc !== null)
        element.onload = onLoadFunc;

        head.appendChild(element);
    }

    //Decoder 
    loadWebAssemblyDecoder() {
        return new Promise<void> (async (resolve, reject) => {
            this.dracoDecoderType['wasmBinaryFile'] = 'draco_decoder.wasm';

            const decoderWasm = await (await fetch('./draco_decoder.wasm')).arrayBuffer();
            
            // For WebAssembly the object passed into DracoModule() must contain a
            // property with the name of wasmBinary and the value must be an
            // ArrayBuffer containing the contents of the .wasm file.
            this.dracoDecoderType['wasmBinary'] = decoderWasm;
            await this.createDecoderModule();

            resolve();
        });
    }

    createDecoderModule() {
        return new Promise<void> ((resolve, reject) => {
            // draco_decoder.js or draco_wasm_wrapper.js must be loaded before
            // DracoModule is created.
            DracoDecoderModule(this.dracoDecoderType).then((module) => {
                this.decoderModule = module;
                resolve();
            });
        });
    }

    // This function will test if the browser has support for WebAssembly. If it
    // does it will download the WebAssembly Draco decoder, if not it will download
    // the asmjs Draco decoder.
    loadDracoDecoder() : Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            if (typeof WebAssembly !== 'object') {
                // No WebAssembly support. DracoModule must be called with no parameters
                // or an empty object to create a JavaScript decoder.
                this.loadJavaScriptFile(this.decoderPath + 'draco_decoder.js', async () => {
                    await this.createDecoderModule();
                    resolve();
                }); 
            } else {
                this.loadJavaScriptFile(this.decoderPath + 'draco_wasm_wrapper.js',  async () => {
                    await this.loadWebAssemblyDecoder();
                    resolve();
                });
            }
        })
    }

    // Encoder
    loadWebAssemblyEncoder() {
        return new Promise<void> ((resolve, reject) => {
            this.dracoEncoderType['wasmBinaryFile'] = 'draco_encoder.wasm';

            const xhr = new XMLHttpRequest();
            xhr.open('GET', this.encoderPath + 'draco_encoder.wasm', true);
            xhr.responseType = 'arraybuffer';

            xhr.onload = async () => {
                // For WebAssembly the object passed into DracoModule() must contain a
                // property with the name of wasmBinary and the value must be an
                // ArrayBuffer containing the contents of the .wasm file.
                this.dracoEncoderType['wasmBinary'] = xhr.response;
                await this.createEncoderModule();
                resolve();
            };

            xhr.send(null)
        });
    }

    createEncoderModule() {
        return new Promise<void> ((resolve, reject) => {
            // draco_encoder.js or draco_wasm_wrapper.js must be loaded before
            // DracoModule is created.
            DracoEncoderModule(this.dracoEncoderType).then((module) => {
                this.decoderModule = module;
                resolve();
            });
        });
    }

    // This function will test if the browser has support for WebAssembly. If it
    // does it will download the WebAssembly Draco decoder, if not it will download
    // the asmjs Draco decoder.
    loadDracoEncoder() : Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            if (typeof WebAssembly !== 'object') {
                // No WebAssembly support. DracoModule must be called with no parameters
                // or an empty object to create a JavaScript decoder.
                this.loadJavaScriptFile(this.decoderPath + 'draco_encoder.js', async () => {
                    await this.createEncoderModule();
                    resolve();
                }); 
            } else {
                this.loadJavaScriptFile(this.decoderPath + 'draco_wasm_wrapper.js',  async () => {
                    await this.loadWebAssemblyEncoder();
                    resolve();
                });
            }
        })
    }
}

export {DRACOModuleLoader};