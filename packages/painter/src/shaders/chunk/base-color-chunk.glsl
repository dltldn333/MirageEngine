vec4 texColor = texture2D(uTexture, resultUv);
baseColor.rgb = mix(texColor.rgb, uBgColor, uBgOpacity);
baseColor.a = max(texColor.a, uBgOpacity);