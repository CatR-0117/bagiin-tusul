import { Logger, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

let ioPromise: Promise<NodeIO> | null = null;

export function getModelIO() {
  ioPromise ??= (async () => {
    await Promise.all([
      MeshoptDecoder.ready,
      MeshoptEncoder.ready,
      MeshoptSimplifier.ready,
    ]);
    const [dracoDecoder, dracoEncoder] = await Promise.all([
      draco3d.createDecoderModule(),
      draco3d.createEncoderModule(),
    ]);

    return new NodeIO()
      .setLogger(new Logger(Logger.Verbosity.WARN))
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        "draco3d.decoder": dracoDecoder,
        "draco3d.encoder": dracoEncoder,
        "meshopt.decoder": MeshoptDecoder,
        "meshopt.encoder": MeshoptEncoder,
      });
  })();
  return ioPromise;
}

export { MeshoptEncoder, MeshoptSimplifier };
