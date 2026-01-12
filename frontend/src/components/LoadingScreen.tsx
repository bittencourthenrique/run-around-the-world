export function LoadingScreen() {
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ backgroundColor: '#3756FB' }}
    >
      <div className="text-center space-y-4">
        {/* Loading label */}
        <div className="text-white text-base md:text-lg font-normal" style={{ fontFamily: '"Google Sans Code"', fontSize: '16px' }}>
          Loading the Map...
        </div>
        
        {/* Progress bar with rounded ends */}
        <div className="relative w-64 md:w-80 h-1.5 bg-white/20 overflow-hidden rounded-none">
          <div 
            className="absolute left-0 top-0 h-full bg-[#D0AF90] rounded-none"
            style={{ 
              animation: 'loadingProgress 1.5s ease-out infinite'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
