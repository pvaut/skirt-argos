import React, { useState } from "react";

import { useCallback, useEffect, useRef } from 'react';
import { initGPUR, renderGPUR } from "./renderGPU";
import { TpGPURContext, TpGPURData } from "./interfaces";
import { guid } from "../misc";


interface TpCanvasGPU {
  pixelRatio: number;
  renderData: TpGPURData;
  registerContext: (ctx: TpGPURContext) => void;
}


export function CanvasGPUR(props: TpCanvasGPU) {
  const refGPURContext = useRef<TpGPURContext | null>(null);
  const refCanvas = useRef<any>(null);

  const [theCanvasKey, setTheCanvasKey] = useState(guid());

  const pixelRatio = props.pixelRatio;

  const init = useCallback((canvas: any) => {
    if (canvas) {
      refCanvas.current = canvas;
      canvas.width = canvas.clientWidth * pixelRatio;
      canvas.height = canvas.clientHeight * pixelRatio;
      const ctx = initGPUR(canvas, props.renderData, pixelRatio);
      refGPURContext.current = ctx;
      props.registerContext(ctx);
      setTimeout(() => { renderGPUR(ctx); }, 25); // make sure it's rendered for the first time

      const reCreateContext = (event: any) => {
        //Changing the canvas key causes React to re-create the canvas element, which triggers the whole webgl initialisation procedure again
        setTimeout(() => {
          console.log(`==> re-creating canvas upon webglcontextlost`);
          setTheCanvasKey(guid());
        }, 25);
      }

      // We override the default behaviour in case a context gets lost
      canvas.addEventListener("webglcontextlost", reCreateContext);

      return () => { // called upon destruction of component;
        canvas.removeEventListener("webglcontextlost", reCreateContext);
      };
    }
  }, []);

  useEffect(() => {
    return () => {
      // function called when canvas gets destroyed
      // Not sure if anything should happen here, though. There does not seem to be a way to actively release the webgl context
    }
  }, []);

  useEffect(() => {
    const ctx = refGPURContext.current;
    if (ctx) {
      // Adapt canvas resolution to the new size
      // NOTE: this component should be wrapped inside a component that forces a rerender when resized, e.g. using useResizedCompRedraw
      const style = getComputedStyle(ctx.canvas);
      const width = +style.getPropertyValue('width').slice(0, -2) * pixelRatio;
      const height = +style.getPropertyValue('height').slice(0, -2) * pixelRatio;
      if ((ctx.canvas.width != width) || (ctx.canvas.height != height)) {
        ctx.canvas.width = width;
        ctx.canvas.height = height;
        renderGPUR(ctx);
      }
    }
  });

  return (
    <canvas
      key={theCanvasKey}
      ref={init}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
