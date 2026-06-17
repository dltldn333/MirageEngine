vec4 texColor = texture2D(uTexture, resultUv);
baseColor.rgb = mix(texColor.rgb, uBgColor.rgb, uBgColor.a);
baseColor.a = max(texColor.a, uBgColor.a);