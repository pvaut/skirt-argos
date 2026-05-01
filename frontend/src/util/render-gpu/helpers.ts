import { getViewport2DCoordConvertors } from "../geometry/viewport2D";
import { createInternalError } from "../errors";
import { TpGPURContext, TpGPURProgramContext } from "./interfaces";
import { RENDER_TYPES } from "./layer-types/colored-points-2D/interfaces";
import { BUFFER_DATA_TYPES, TpGPUBufferInfo, TpGPURLayerInstance, TpGPURLayerTypeDefinition } from "./layer-types/interfaces";
import { getViewportVolumeCoordConvertors } from "../geometry/viewportVolume";


export function getLayerProgram(layerConfig: TpGPURLayerInstance) {
    return layerConfig.ctx.layerTypeProgramsMap[layerConfig.layerType];
}


function createShader(gl: any, type: any, source: string): any {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader;
    else {
        // @todo: better error handling?
        alert(`ERROR WHILE CREATING SHADER;\n${gl.getShaderInfoLog(shader)}\n${source}`);
        gl.deleteShader(shader);
    }
}


export function createGPUProgram(gl: any,
    codeVertexShader: string, codeFragmentShader: string,
    layerTypeDef: TpGPURLayerTypeDefinition
): TpGPURProgramContext {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, codeVertexShader);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, codeFragmentShader);

    const theWebGLProgram = gl.createProgram();
    gl.attachShader(theWebGLProgram, vertexShader);
    gl.attachShader(theWebGLProgram, fragmentShader);
    gl.linkProgram(theWebGLProgram);
    const success = gl.getProgramParameter(theWebGLProgram, gl.LINK_STATUS);
    if (!success) {
        // @todo: better error handling?
        alert(gl.getProgramInfoLog(theWebGLProgram));
        gl.deleteProgram(theWebGLProgram);
    }

    // Special uniforms used for 2D viewport tracking
    const locConvFactor = gl.getUniformLocation(theWebGLProgram, 'u_conv_factor');
    const locConvOffset = gl.getUniformLocation(theWebGLProgram, 'u_conv_offset');

    const theProgram: TpGPURProgramContext = {
        theWebGLProgram,
        locConvFactor,
        locConvOffset,
        viewPortVolume: {
            locCenter: gl.getUniformLocation(theWebGLProgram, 'u_projection_center'),
            locXProj: gl.getUniformLocation(theWebGLProgram, 'u_projection_x'),
            locYProj: gl.getUniformLocation(theWebGLProgram, 'u_projection_y'),
            locZProj: gl.getUniformLocation(theWebGLProgram, 'u_projection_z'),
            locViewDir: gl.getUniformLocation(theWebGLProgram, 'u_view_dir'),
            locAspectCorrX: gl.getUniformLocation(theWebGLProgram, 'u_aspect_corr_x'),
            locAspectCorrY: gl.getUniformLocation(theWebGLProgram, 'u_aspect_corr_y'),
        },
        attributes: [],
        uniforms: [],
    }

    for (const bufferDef of layerTypeDef.bufferDefs)
        gpuProgramCreateAttribute(gl, theProgram, `a_${bufferDef.name}`);

    for (const uniformDef of layerTypeDef.uniformDefs)
        gpuProgramCreateUniform(gl, theProgram, `u_${uniformDef.name}`);

    return theProgram;
}



export function gpuProgramCreateAttribute(gl: any, program: TpGPURProgramContext, name: string) {
    if (program.attributes.find(attribute => attribute.name == name))
        throw createInternalError(`Attribute already defined: ${name}`);
    const location = gl.getAttribLocation(program.theWebGLProgram, name);
    program.attributes.push({ name, location });
}


export function gpuGetAttributeLocation(program: TpGPURProgramContext, name: string) {
    const attribute = program.attributes.find(attribute => attribute.name == name);
    if (!attribute) throw createInternalError(`Attribute not found: ${name}`)
    return attribute.location;
}


export function gpuProgramCreateUniform(gl: any, program: TpGPURProgramContext, name: string) {
    if (program.uniforms.find(uniform => uniform.name == name))
        throw createInternalError(`Uniform already defined: ${name}`);
    const location = gl.getUniformLocation(program.theWebGLProgram, name);
    program.uniforms.push({ name, location });
}


export function gpuGetUniformLocation(program: TpGPURProgramContext, name: string) {
    const uniform = program.uniforms.find(uniform => uniform.name == name);
    if (!uniform) throw createInternalError(`Uniform not found: ${name}`)
    return uniform.location;
}


export function gpuCreateBuffers(ctx: TpGPURContext, layerDef: TpGPURLayerTypeDefinition): { [name: string]: TpGPUBufferInfo } {
    const gl = ctx.gl;
    const buffers: { [name: string]: TpGPUBufferInfo } = {};
    for (const bufferDef of layerDef.bufferDefs) buffers[bufferDef.name] = {
        currentData: null,
        buffer: gl.createBuffer(),
        size: bufferDef.size,
        dataType: bufferDef.dataType,
    };
    return buffers;
}


export function gpuSetBufferData(renderer: TpGPURLayerInstance, name: string, data: any | null) {
    // WARNING: an update will only be triggered if the pointer of the data was modified (i.e. consider the data array immutable)
    const gl = renderer.ctx.gl;
    const bufferInfo = renderer.buffers[name];
    if (data !== bufferInfo.currentData) {
        if (data) {
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data || null, gl.STATIC_DRAW);
        }
        bufferInfo.currentData = data;
    }
}


export function gpuActivateBuffer(layerConfig: TpGPURLayerInstance, name: string) {
    const gl = layerConfig.ctx.gl;
    const myProgram = getLayerProgram(layerConfig);
    const bufferInfo = layerConfig.buffers[name];
    const location = gpuGetAttributeLocation(myProgram, `a_${name}`);
    if (location < 0) console.log(`==> Could not get location for ${name}`);
    gl.enableVertexAttribArray(location);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    let dataType;
    if (bufferInfo.dataType == BUFFER_DATA_TYPES.FLOAT) dataType = gl.FLOAT;
    else if (bufferInfo.dataType == BUFFER_DATA_TYPES.BYTE) dataType = gl.BYTE;
    else throw createInternalError(`Invalid buffer data type: ${bufferInfo.dataType}`);
    gl.vertexAttribPointer(location, bufferInfo.size, dataType, false, 0, 0,);
}


export function gpuSetAttributeDefaultValue(layerConfig: TpGPURLayerInstance, name: string, defaultValue: any) {
    const gl = layerConfig.ctx.gl;
    const myProgram = getLayerProgram(layerConfig);
    const location = gpuGetAttributeLocation(myProgram, `a_${name}`);
    gl.disableVertexAttribArray(location);
    gl.vertexAttrib1f(location, 0.5); // NOTE: currently only implemented for single float uniforms, extend thus by looking at the data type of defaultValue
}



export function gpuSetUniformValue(layerConfig: TpGPURLayerInstance, name: string, value: any) {
    const gl = layerConfig.ctx.gl;
    const myProgram = getLayerProgram(layerConfig);
    const location = gpuGetUniformLocation(myProgram, `u_${name}`);
    gl.uniform1f(location, value); // @todo: currently only implemented for single-valued floats, should be extended
}


export function setGPURViewport(ctx: TpGPURContext, program: TpGPURProgramContext) {
    const gl = ctx.gl;

    if (ctx.viewport2D) {
        const coordConvertors = getViewport2DCoordConvertors(ctx.viewport2D);
        gl.uniform2f(program.locConvOffset!, coordConvertors.gpur.offsetX, coordConvertors.gpur.offsetY);
        gl.uniform2f(program.locConvFactor!, coordConvertors.gpur.zoomX, coordConvertors.gpur.zoomY);
    }

    if (ctx.viewportVolume) {
        const { origin, axisX, axisY, axisZUnscaled, viewDir, aspectRatio } = getViewportVolumeCoordConvertors(ctx.viewportVolume!);
        gl.uniform3f(program.viewPortVolume.locCenter!, origin.x, origin.y, origin.z);
        gl.uniform3f(program.viewPortVolume.locXProj!, axisX.x, axisX.y, axisX.z);
        gl.uniform3f(program.viewPortVolume.locYProj!, axisY.x, axisY.y, axisY.z);
        gl.uniform3f(program.viewPortVolume.locZProj!, axisZUnscaled.x, axisZUnscaled.y, axisZUnscaled.z);
        gl.uniform3f(program.viewPortVolume.locViewDir!, viewDir.x, viewDir.y, viewDir.z);
        gl.uniform1f(program.viewPortVolume.locAspectCorrX, aspectRatio < 1 ? aspectRatio : 1);
        gl.uniform1f(program.viewPortVolume.locAspectCorrY, aspectRatio > 1 ? 1 / aspectRatio : 1);
    }
}


export function set2DBlendType(gl: any, renderType: string) {
    if (renderType == RENDER_TYPES.TRANSLUCENT) {
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);
    } else if (renderType == RENDER_TYPES.LUMINOUS) {
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
        gl.disable(gl.DEPTH_TEST);
    } else if (renderType == RENDER_TYPES.OPAQUE) {
        gl.disable(gl.BLEND);
        // NOTE: enabling depth test improves speed in case a lot of overlapping fragments are drawn (e.g. clusters of points)
        // Overlapping fragments create a bottleneck for the GPU, as they cannot by parallelized
        // Therefore we activate depth test for fast, opaque points rendering
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.clear(gl.DEPTH_BUFFER_BIT); // We clear the depth buffer, because we want to respect the order of the different 2D drawing layers (e.g. unselected vs. selected points)
    } else throw createInternalError(`Invalid render type: ${renderType}`);
}


export function checkFloat32Array(input: any): Float32Array | null | undefined {
    if ((input == null) || (input == undefined)) return input;
    if (input instanceof Float32Array) return input;
    if (input instanceof Float64Array) return new Float32Array(input);
    if ((input instanceof Int32Array) || (input instanceof Uint32Array) || (input instanceof Uint8Array)) return new Float32Array(input);
    throw createInternalError('Expected FloatArray');
}

export function checkUint8Array(input: any): Uint8Array | null | undefined {
    if ((input == null) || (input == undefined)) return input;
    if (input instanceof Uint8Array) return input;
    throw createInternalError('Expected Uint8Array');
}