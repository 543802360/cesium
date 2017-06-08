/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap'
    ], function(
        defined,
        destroyObject,
        PixelFormat,
        Framebuffer,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    'use strict';

     /**
     * @private
     */
    function PointCloudPostProcessor() {
        this._framebuffers = undefined;
        this._colorTextures = undefined;
        this._depthTexture = undefined;
        this._drawCommands = undefined;
    }

    function createSampler() {
        return new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
    }

    function destroyFramebuffers(processor) {
        if (!defined(processor._depthTexture)) {
            return;
        }
        processor._depthTexture.destroy();
        processor._colorTextures[0].destroy();
        processor._colorTextures[1].destroy();
        processor._framebuffers[0].destroy();
        processor._framebuffers[1].destroy();

        processor._depthTexture = undefined;
        processor._colorTextures = undefined;
        processor._framebuffers = undefined;
    }

    function createFramebuffers(processor, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        var depthTexture = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
            sampler : createSampler()
        });

        var colorTextures = new Array(2);
        var framebuffers = new Array(2);

        for (var i = 0; i < 2; ++i) {
            colorTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : createSampler()
            });

            // TODO : for now assume than any pass can write depth, possibly through EXT_frag_depth. Definitely needed for the initial render into the FBO, possibly also the ping-pong processing.
            framebuffer[i] = new Framebuffer({
                context : context,
                depthStencilTexture : depthTexture,
                colorTextures : [colorTextures[i]],
                destroyTextures : false
            });
        }

        processor._depthTexture = depthTexture;
        processor._colorTextures = colorTextures;
        processor._framebuffers = framebuffers;
    }

    function createCommands(processor, context) {
        var framebuffers = processor._framebuffer;
        var uniformsMaps = new Array(2);
        uniformsMaps[0] = {
            pointCloud_colorTexture : function() {
                return processor._colorTextures[1];
            },
            pointCloud_depthTexture : function() {
                return processor._depthTexture;
            }
        };
        uniformsMaps[1] = {
            pointCloud_colorTexture : function() {
                return processor._colorTextures[0];
            },
            pointCloud_depthTexture : function() {
                return processor._depthTexture;
            }
        };

        var fs = 'uniform sampler2D pointCloud_colorTexture; \n' +
                 'uniform sampler2D pointCloud_depthTexture; \n' +
                 'varying vec2 v_textureCoordinates; \n' +
                 'void main() \n' +
                 '{ \n' +
                 '    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
                 '    float depth = texture2D(pointCloud_depthTexture, v_textureCoordinates).r; \n' +
                 '    gl_FragColor = color * (1.0 - depth); \n' +
                 '} \n';


        // TODO : faked for testing
        var stagesLength = 3;

        var drawCommands = new Array(stagesLength);
        for (var i = 0; i < stagesLength; ++i) {
            var uniformMap = uniformMaps[i % 2];
            var framebuffer = processor._framebuffers[i % 2];
            drawCommands[i] = context.createViewportQuadCommand(fs, {
                uniformMap : uniformMap,
                owner : processor,
                framebuffer : framebuffer // TODO : what if framebuffer changes due to resize
            });
        }

        processor._drawCommands = drawCommands;
    }

    function createResources(processor, context) {
        var i;

        if (!defined(processor._depthTexture) || (processor._depthTexture.width !== screenWidth) || (processor._depthTexture.height !== screenHeight)) {
            destroyFramebuffers();
            createFramebuffers();
        }

        if (!defined(processor._drawCommands)) {
            createCommands();
        }


        var framebuffers = this._framebuffers;

    }

    function processingSupported(context) {
        return context.depthTexture;
    }

    PointCloudPostProcessor.prototype.update = function(frameState, commandStart) {
        var context = frameState.context;
        if (!processingSupported(context)) {
            return;
        }

        createResources(frameState.context);

        var commandList = frameState.commandList;
        var commandEnd = commandList.length;
        for (var i = commandStart; i < commandEnd; ++i) {
            // TODO : use derived commands?
            var command = commandList[i];
            command.
        }

        var commandsLength = frameState.commands

        // Edit commands so that they reference a different fbo... then add some post-process commands
        // then need to clear the FBO
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloudPostProcessor.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloudPostProcessor.prototype.destroy = function() {
        // TODO
        // Destroy commands shaders and FBOS
        return destroyObject(this);
    };

    return PointCloudPostProcessor;
});
