vec4 texColor = texture2D(uTexture, resultUv);
baseColor = blendSrcOver(baseColor, texColor);