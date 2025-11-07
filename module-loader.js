// module-loader.js

const version = new Date().getTime();

function bust(modulePath) {
    // Ensure the path starts with ./
    const correctedPath = modulePath.startsWith('./') ? modulePath : `./${modulePath}`;
    return `${correctedPath}?v=${version}`;
}

// This function dynamically imports all our modules with cache-busting
export async function loadAllModules() {
    const [
        state,
        utils,
        dataLoader,
        appInit,
        filters,
        listeners,
        uiRenderer,
        devTools
    ] = await Promise.all([
        import(bust('state.js')),
        import(bust('utils.js')),
        import(bust('data-loader.js')),
        import(bust('app-init.js')),
        import(bust('filters.js')),
        import(bust('listeners.js')),
        import(bust('ui-renderer.js')),
        import(bust('dev-tools.js'))
    ]);

    return {
        state,
        utils,
        dataLoader,
        appInit,
        filters,
        listeners,
        uiRenderer,
        devTools
    };
}
