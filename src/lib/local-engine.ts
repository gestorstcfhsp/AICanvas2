

interface GenerationParams {
    apiEndpoint: string;
    prompt: string;
    negativePrompt: string;
    steps: number;
    cfgScale: number;
    checkpointModel: string;
}

const handleApiError = async (response: Response): Promise<string> => {
    try {
        const errorBody = await response.text();
        return `Error de la API local (${response.status}): ${errorBody}`;
    } catch (e) {
        return `Error de la API local (${response.status}): No se pudo leer el cuerpo del error.`;
    }
};

const handleFetchError = (error: any): string => {
     if (error instanceof TypeError && error.message.includes('fetch')) {
        return 'No se pudo conectar con la API local. Posibles causas: (1) El servidor no está en ejecución. (2) La dirección es incorrecta. (3) Problema de CORS no configurado en el servidor local. (4) Error de contenido mixto (página HTTPS intentando llamar a un servidor HTTP). Revisa la consola del navegador para más detalles.';
    }
    return 'Ha ocurrido un error de red desconocido.';
};

export async function getLocalConfig(apiEndpoint: string): Promise<any> {
    try {
        const optionsUrl = apiEndpoint.replace("txt2img", "options");
        const response = await fetch(optionsUrl);

        if (!response.ok) {
            throw new Error(await handleApiError(response));
        }

        return await response.json();
    } catch (error: any) {
        if (error.message.startsWith('Error de la API local')) {
            throw error;
        }
        throw new Error(handleFetchError(error));
    }
}


export async function generateImageLocal({
    apiEndpoint,
    prompt,
    negativePrompt,
    steps,
    cfgScale,
    checkpointModel
}: GenerationParams): Promise<string> {
    const payload: any = {
        prompt,
        negative_prompt: negativePrompt,
        steps: steps,
        cfg_scale: cfgScale,
        width: 512,
        height: 512,
    };

    if (checkpointModel) {
        payload.override_settings = {
            sd_model_checkpoint: checkpointModel,
        };
        payload.override_settings_restore_afterwards = true;
    }

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(await handleApiError(response));
        }

        const result = await response.json();
        if (!result.images || result.images.length === 0) {
            throw new Error('La API local no devolvió ninguna imagen.');
        }

        return `data:image/png;base64,${result.images[0]}`;
    } catch (error: any) {
         if (error.message.startsWith('Error de la API local')) {
            throw error;
        }
        throw new Error(handleFetchError(error));
    }
}
