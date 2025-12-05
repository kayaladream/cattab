'use client';

import { useState, useEffect, useRef } from 'react';
import { Lunar } from 'lunar-javascript';

export default function Home() {
  // --- 状态管理 ---
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [lunarDate, setLunarDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [links, setLinks] = useState([]);
  
  // 搜索引擎状态
  const [engines, setEngines] = useState([]);
  const [currentEngine, setCurrentEngine] = useState({ name: '百度', url: 'https://www.baidu.com/s?wd=' });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // 引用 Ref 用于检测点击外部
  const searchContainerRef = useRef(null);

  // --- 初始化逻辑 ---
  useEffect(() => {
    // 1. 读取导航链接
    const envLinks = process.env.NEXT_PUBLIC_NAV_LINKS;
    if (envLinks) {
      try { setLinks(JSON.parse(envLinks)); } catch (e) { console.error("导航链接解析失败", e); }
    } else {
      setLinks([{ name: '演示-淘宝', url: 'https://www.taobao.com' }]);
    }

    // 2. 读取搜索引擎
    const envEngines = process.env.NEXT_PUBLIC_SEARCH_ENGINES;
    let loadedEngines = [
      { name: '百度', url: 'https://www.baidu.com/s?wd=' },
    ];
    if (envEngines) {
      try {
        const parsed = JSON.parse(envEngines);
        if (parsed.length > 0) loadedEngines = parsed;
      } catch (e) { console.error("搜索引擎配置解析失败", e); }
    }
    setEngines(loadedEngines);
    setCurrentEngine(loadedEngines[0]);

    // 3. 时间更新
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'long' }));
      const lunar = Lunar.fromDate(now);
      setLunarDate(`农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // 4. 点击外部关闭下拉菜单
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- 事件处理 ---
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    window.location.href = `${currentEngine.url}${encodeURIComponent(searchQuery)}`;
  };

  const handleEngineSelect = (engine) => {
    setCurrentEngine(engine);
    setIsDropdownOpen(false);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden text-white font-sans">
      
      {/* 背景视频 */}
      <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0">
        <source src="/background/cat.mp4" type="video/mp4" />
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-black/10 z-10 pointer-events-none" />

      {/* 主体内容 */}
      <div className="relative z-20 flex flex-col items-center pt-44 h-full w-full px-4">
        
        {/* 时钟 */}
        <div className="flex items-end gap-3 mb-8 drop-shadow-md select-none">
          <h1 className="text-7xl font-light tracking-wide">{time}</h1>
          <div className="flex flex-col text-sm font-medium opacity-90 pb-2 gap-1">
            <span>{date}</span>
            <span className="text-xs opacity-70 tracking-wider">{lunarDate}</span>
          </div>
        </div>

        {/* 搜索框容器 (Ref 绑定在这里) */}
        <form 
          ref={searchContainerRef}
          onSubmit={handleSearch} 
          className="w-full max-w-xl relative z-50"
        >
          <div className="relative flex items-center bg-white/90 backdrop-blur-sm rounded-full h-12 px-2 shadow-lg transition-all duration-300 hover:bg-white">
            
            {/* 搜索引擎选择按钮 */}
            <button
              type="button" 
              className="pl-4 pr-3 flex items-center gap-1 cursor-pointer border-r border-gray-300/50 h-3/5 hover:opacity-70 transition-opacity focus:outline-none"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="text-gray-600 text-sm font-bold select-none whitespace-nowrap min-w-[3em] text-center">
                {currentEngine.name}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 下拉菜单 */}
            {isDropdownOpen && (
              <div className="absolute top-14 left-0 w-36 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {engines.map((engine, index) => (
                  <div
                    key={index}
                    onClick={() => handleEngineSelect(engine)}
                    className={`
                      px-4 py-2 text-sm cursor-pointer rounded-lg transition-all duration-200
                      /* 
                         逻辑修改：
                         1. 只有 hover 时显示背景 (hover:bg-black/5)
                         2. 选中的项 (currentEngine) 只显示加粗和深色字，不显示背景
                         3. 这样就不会出现两条背景色了
                      */
                      hover:bg-black/5 hover:scale-105
                      ${currentEngine.name === engine.name 
                        ? 'text-black font-extrabold'  // 选中状态：更黑、更粗
                        : 'text-gray-600 font-medium'  // 默认状态：深灰
                      }
                    `}
                  >
                    {engine.name}
                  </div>
                ))}
              </div>
            )}

            {/* 输入框 */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-800 text-sm h-full px-3"
              autoFocus
            />

            {/* 搜索按钮 */}
            <button 
              type="submit" 
              className="h-9 w-9 bg-[#2c2c2c] rounded-full flex items-center justify-center hover:bg-black transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* 底部导航 */}
      <div className="absolute bottom-0 w-full z-30 pb-8 sm:pb-12">
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-300/20 to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap justify-center gap-4 sm:gap-8 px-4">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-sm sm:text-base font-medium text-white/90 tracking-wider 
                px-4 py-2 rounded-full transition-all duration-200
                hover:bg-white/20 hover:text-white hover:backdrop-blur-sm
              "
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
