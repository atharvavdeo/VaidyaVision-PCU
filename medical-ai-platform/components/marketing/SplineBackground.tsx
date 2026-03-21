import Spline from '@splinetool/react-spline/next';

export default function SplineBackground() {
  return (
    <div className="absolute inset-0 z-0 h-full w-full bg-white pointer-events-none">
      <div className="absolute inset-0 w-full h-full pointer-events-auto">
        <Spline
          scene="https://prod.spline.design/OaZEp9rPqHficj2y/scene.splinecode"
          className="h-full w-full opacity-100 transition-opacity duration-1000 scale-100"
        />
      </div>
    </div>
  );
}
