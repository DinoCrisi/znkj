
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Plus, Zap, Play, Download, Trash2, 
  Upload as UploadIcon, History as HistoryIcon, Layout, CheckCircle2,
  ArrowRight, Settings, Image as ImageIcon, ExternalLink, Sparkles,
  FileJson, Search, Filter, Layers, Clock, MoreHorizontal, Link as LinkIcon, 
  AlertCircle, Cpu, UserRound, Clapperboard, X
} from 'lucide-react';
import { ViewType, ProjectStatus, AppState, DeconstructedVideo, GeneratedVideo, VideoScriptSegment } from './types';
import { analyzeVideoAI, generateVisualThumbnail } from './services/geminiService';

// --- Shared Components ---

const GlassCard: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`glass-panel rounded-3xl p-6 ${className}`}>{children}</div>
);

const StepIndicator = ({ step }: { step: number }) => (
  <div className="flex items-center justify-center gap-4 mb-8">
    {[
      { n: 1, l: "分析" },
      { n: 2, l: "设置" },
      { n: 3, l: "生成" }
    ].map((s) => (
      <React.Fragment key={s.n}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? 'bg-violet-600 text-white' : 'bg-white/10 text-gray-500'}`}>
            {step > s.n ? <CheckCircle2 size={14} /> : s.n}
          </div>
          <span className={`text-sm font-medium ${step >= s.n ? 'text-white' : 'text-gray-500'}`}>{s.l}</span>
        </div>
        {s.n < 3 && <div className={`w-12 h-[1px] ${step > s.n ? 'bg-violet-600' : 'bg-white/10'}`} />}
      </React.Fragment>
    ))}
  </div>
);

// --- Main App ---

export default function App() {
  const [uploadTab, setUploadTab] = useState<'file' | 'link'>('file');
  const [videoLink, setVideoLink] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRoleDetail, setShowRoleDetail] = useState<'employee' | 'deconstructor' | null>(null);

  // Persistence and initial mock data
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('smartclip_v2_data');
    const initialHistory: DeconstructedVideo[] = [
      {
        id: 'h-1',
        title: '某爆款美妆精华测评 - 100w+点赞',
        niche: '美妆/个护',
        formula_name: '痛点对比式',
        structure: '糟糕现状 -> 产品切入 -> 惊人反差',
        pace: '1.2s/镜头',
        core_elements: '大字幕, 极速卡点',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        segments: [
          { id: 's1', time: '0-2s', hook_type: '痛点钩子', visual_prompt: 'Close up skin problems', voiceover_text: '你以为你的脸真的洗干净了吗？', retention_strategy: 'Fear of missing out', thumbnail: 'https://picsum.photos/400/711?random=11' },
          { id: 's2', time: '2-5s', hook_type: '产品引入', visual_prompt: 'Product aesthetic shot', voiceover_text: '其实你需要的是这款氨基酸洁面', retention_strategy: 'Visual satisfaction', thumbnail: 'https://picsum.photos/400/711?random=12' }
        ]
      },
      {
        id: 'h-2',
        title: '智能家居好物分享 - 50w+点赞',
        niche: '家居/数码',
        formula_name: '生活场景式',
        structure: '懒人需求 -> 自动操作 -> 优雅生活',
        pace: '2.5s/镜头',
        core_elements: '柔和光影, 暖色调',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        segments: [
          { id: 's3', time: '0-3s', hook_type: '场景钩子', visual_prompt: 'Person tired after work', voiceover_text: '下班回家最累的就是打扫卫生', retention_strategy: 'Empathy', thumbnail: 'https://picsum.photos/400/711?random=13' }
        ]
      }
    ];

    const initialAssets: VideoScriptSegment[] = initialHistory.flatMap(h => h.segments.map(s => ({ ...s, sourceTitle: h.title, niche: h.niche })));

    const initial: AppState = {
      currentView: ViewType.HOME,
      status: ProjectStatus.IDLE,
      analysis: null,
      productInfo: { name: '', sellingPoints: [''], images: [] },
      genCount: 3,
      results: [],
      history: initialHistory,
      assets: initialAssets
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed, currentView: ViewType.HOME, status: ProjectStatus.IDLE };
      } catch (e) { return initial; }
    }
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('smartclip_v2_data', JSON.stringify({
      history: state.history,
      assets: state.assets
    }));
  }, [state.history, state.assets]);

  // Navigation logic
  const navigate = (view: ViewType) => {
    setState(prev => ({ ...prev, currentView: view }));
    setErrorMessage(null);
  };

  // Actions
  const onUploadStart = () => {
    setState(prev => ({ ...prev, status: ProjectStatus.UPLOADING }));
    setTimeout(() => {
      setState(prev => ({ ...prev, status: ProjectStatus.IDLE }));
    }, 1200);
  };

  const handleLinkAnalysis = async () => {
    if (!videoLink.trim()) return;
    setErrorMessage(null);
    setState(prev => ({ ...prev, status: ProjectStatus.UPLOADING }));
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (videoLink.includes('private') || Math.random() < 0.3) {
      setState(prev => ({ ...prev, status: ProjectStatus.IDLE }));
      setErrorMessage("该链接不允许被下载，请上传视频");
      return;
    }
    handleStartAnalysis();
  };

  const handleStartAnalysis = async () => {
    setState(prev => ({ ...prev, status: ProjectStatus.ANALYZING }));
    const result = await analyzeVideoAI("爆款分析_" + Date.now() + ".mp4");
    const segmentsWithThumbs = await Promise.all(result.segments.map(async s => ({
      ...s,
      id: Math.random().toString(36).substr(2, 9),
      thumbnail: await generateVisualThumbnail(s.visual_prompt),
      sourceTitle: result.title,
      niche: result.niche
    })));
    const finalAnalysis: DeconstructedVideo = {
      ...result,
      id: Math.random().toString(36).substr(2, 9),
      segments: segmentsWithThumbs,
      createdAt: new Date().toISOString()
    };
    setState(prev => ({ 
      ...prev, 
      status: ProjectStatus.IDLE, 
      analysis: finalAnalysis, 
      currentView: ViewType.ANALYSIS,
      history: [finalAnalysis, ...prev.history],
      assets: [...segmentsWithThumbs, ...prev.assets]
    }));
  };

  const handleExportJianying = (video: DeconstructedVideo) => {
    alert(`正在为您生成《${video.title}》的剪映工程文件(.draft)...\n所有黄金时间轴已对齐完毕！`);
  };

  const handleReplicate = (video: DeconstructedVideo) => {
    setState(prev => ({ 
      ...prev, 
      analysis: video, 
      productInfo: { name: '', sellingPoints: [''], images: [] },
      currentView: ViewType.SETUP 
    }));
  };

  const handleDeleteHistory = (id: string) => {
    setState(prev => ({
      ...prev,
      history: prev.history.filter(h => h.id !== id)
    }));
  };

  const handleGenerate = async () => {
    setState(prev => ({ ...prev, status: ProjectStatus.GENERATING }));
    const results: GeneratedVideo[] = [];
    for (let i = 0; i < state.genCount; i++) {
      const sp = state.productInfo.sellingPoints[i % state.productInfo.sellingPoints.length] || "高品质";
      results.push({
        id: Math.random().toString(),
        version: `版本 ${i + 1}`,
        sellingPoint: sp,
        thumbnail: await generateVisualThumbnail(`${state.productInfo.name} ${sp}`)
      });
    }
    setState(prev => ({ ...prev, status: ProjectStatus.DONE, results, currentView: ViewType.SUCCESS }));
  };

  // --- View Renderers ---

  const renderHome = () => (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Hi, 创作专家 👋</h1>
        <div className="flex gap-4">
           <button onClick={() => navigate(ViewType.ASSETS)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2">
             <Layers size={18} className="text-violet-400" /> 素材库
           </button>
           <button onClick={() => navigate(ViewType.HISTORY)} className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 hover:bg-violet-600/30 transition-all">
             <HistoryIcon size={20} />
           </button>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        <button 
          onClick={() => navigate(ViewType.UPLOAD)}
          className="group relative overflow-hidden h-64 rounded-[2.5rem] bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-left transition-all hover:scale-[1.01] active:scale-95 shadow-2xl shadow-violet-600/20"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Zap className="text-white fill-white" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">开始分析爆款</h2>
              <p className="text-white/70 text-sm">上传任意短视频，即刻提取黄金流量公式</p>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
        </button>

        <button 
          onClick={() => navigate(ViewType.ASSETS)}
          className="group glass-panel flex flex-col h-64 p-8 rounded-[2.5rem] border-dashed border-white/10 hover:border-violet-500/30 transition-all text-left"
        >
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-auto group-hover:bg-violet-600/10 transition-all">
            <ImageIcon className="text-gray-400 group-hover:text-violet-400" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">灵感素材库</h3>
            <p className="text-gray-400 text-sm">已保存 {state.assets.length} 个爆款视频分镜</p>
          </div>
        </button>
      </div>

      {/* AI Roles Display Area */}
      <div className="mb-20">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Sparkles className="text-violet-400" size={20} />
          智能角色实验室
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Role 1: Template Engineer */}
          <div 
            onClick={() => setShowRoleDetail('employee')}
            className="glass-panel p-8 rounded-[2rem] border-white/5 hover:border-violet-500/30 transition-all cursor-pointer group relative"
          >
            <div className="absolute top-6 right-6 px-3 py-1 bg-violet-600/20 text-violet-400 rounded-full text-[10px] font-bold tracking-wider uppercase border border-violet-500/20">
              抖音电商专属
            </div>
            <div className="flex items-start gap-6 mb-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-600/20">
                <UserRound className="text-white" size={40} />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="text-2xl font-bold mb-2">模板工程师</h4>
                <p className="text-gray-400 text-sm leading-relaxed">搭建高转化模板库，让爆款视频可复制</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                按品类／场景搭建专属模板库，覆盖服饰／食品／美妆等带货场景
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                支持参数化配置，一键替换商品图、卖点文案、背景音乐
              </div>
            </div>
          </div>

          {/* Role 2: Storyboard Deconstructor */}
          <div 
            onClick={() => setShowRoleDetail('deconstructor')}
            className="glass-panel p-8 rounded-[2rem] border-white/5 hover:border-violet-500/30 transition-all cursor-pointer group relative"
          >
            <div className="absolute top-6 right-6 px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-[10px] font-bold tracking-wider uppercase border border-emerald-500/20">
              爆款逻辑拆解专家
            </div>
            <div className="flex items-start gap-6 mb-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <Clapperboard className="text-white" size={40} />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="text-2xl font-bold mb-2">分镜拆解师</h4>
                <p className="text-gray-400 text-sm leading-relaxed">一键拆解爆款视频结构，小白也能拍出高转化内容</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                解析抖音爆款分镜节奏，提取黄金3秒开头公式
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                上传参考视频，自动生成带时长/景别的分镜脚本
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                按服饰/食品/美妆等品类，推荐最优拍摄分镜模板
              </div>
            </div>
          </div>
        </div>
        
        {/* Synergy Instruction */}
        <div className="mt-8 flex justify-center">
          <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-medium text-gray-500 flex items-center gap-3">
            <span className="text-violet-400 font-bold">【协同工作流】</span>
            <span>分镜拆解师输出爆款分镜脚本</span>
            <ArrowRight size={14} />
            <span>模板工程师基于脚本自动生成带货视频，全流程无需人工干预</span>
          </div>
        </div>
      </div>

      {/* Role Details Modal */}
      {showRoleDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-panel max-w-2xl w-full p-10 rounded-[3rem] relative border-white/20 overflow-hidden">
            <button 
              onClick={() => setShowRoleDetail(null)}
              className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <div className="flex items-center gap-6 mb-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${showRoleDetail === 'employee' ? 'bg-violet-600' : 'bg-emerald-600'}`}>
                {showRoleDetail === 'employee' ? <UserRound className="text-white" size={32} /> : <Clapperboard className="text-white" size={32} />}
              </div>
              <div>
                <h3 className="text-3xl font-bold">{showRoleDetail === 'employee' ? '模板工程师' : '分镜拆解师'}</h3>
                <p className={`text-sm font-bold mt-1 ${showRoleDetail === 'employee' ? 'text-violet-400' : 'text-emerald-400'}`}>
                  {showRoleDetail === 'employee' ? '高转化短视频模板化生产引擎' : '爆款基因解构与复刻专家'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">角色定位</h5>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {showRoleDetail === 'employee' 
                    ? '通过参数化配置，将成熟的爆款逻辑沉淀为可复用的行业模板。' 
                    : '基于海量爆款数据提炼可复用的分镜逻辑，将创意标准化的专家。'}
                </p>
              </div>
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">典型场景</h5>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {showRoleDetail === 'employee' 
                    ? '品牌视觉统筹、跨品类快速测品、规模化账号内容产出。' 
                    : '新手商家学习拍摄、品牌方批量制作标准化视频、优化内容结构。'}
                </p>
              </div>
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">平台价值</h5>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {showRoleDetail === 'employee' 
                    ? '极大降低制作门槛，确保品牌调性统一，提升内容分发确定性。' 
                    : '0经验掌握爆款方法论，缩短内容试错周期，大幅提升带货转化率。'}
                </p>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center text-gray-500 text-sm italic">
               * 当前角色由 AI 深度驱动，功能模块正在逐步开放中...
            </div>
          </div>
        </div>
      )}

      {/* Existing: Recent Deconstructions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">最近拆解</h3>
          <button onClick={() => navigate(ViewType.HISTORY)} className="text-sm text-gray-500 hover:text-white transition-colors">查看全部</button>
        </div>
        {state.history.slice(0, 3).map((item, i) => (
          <div key={item.id} className="glass-panel p-4 rounded-2xl flex items-center gap-4 group hover:bg-white/5 transition-all">
            <div className="w-20 h-20 bg-gray-800 rounded-xl overflow-hidden relative border border-white/5">
              <img src={item.segments[0]?.thumbnail} className="w-full h-full object-cover" />
              <Play className="absolute inset-0 m-auto text-white/50" size={16} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm mb-1 line-clamp-1">{item.title}</h4>
              <div className="flex gap-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                <span className="text-emerald-400">{item.formula_name}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { setState(s => ({ ...s, analysis: item })); navigate(ViewType.ANALYSIS); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all"
              >
                详情
              </button>
              <button 
                onClick={() => handleReplicate(item)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-bold transition-all shadow-lg shadow-violet-600/20"
              >
                复刻
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(ViewType.HOME)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold">我的历史分析</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="text" placeholder="搜索历史分析..." className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-violet-600 outline-none w-64" />
          </div>
          <button className="p-2 border border-white/10 rounded-xl hover:bg-white/5 text-gray-400"><Filter size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {state.history.map((item) => (
          <GlassCard key={item.id} className="flex items-center gap-6 p-5 group">
            <div className="w-32 aspect-video bg-gray-800 rounded-xl overflow-hidden relative border border-white/10 flex-shrink-0">
               <img src={item.segments[0]?.thumbnail} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play fill="white" size={24} />
               </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                    <span>{item.niche}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-emerald-400">{item.formula_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => handleExportJianying(item)}
                     className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold border border-white/5"
                   >
                     <FileJson size={14} className="text-blue-400" /> 导出剪映
                   </button>
                   <button onClick={() => handleDeleteHistory(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-600 hover:text-red-500 transition-all">
                     <Trash2 size={16}/>
                   </button>
                </div>
              </div>
              <div className="flex gap-6 mt-4">
                <div className="text-center bg-white/5 rounded-xl px-4 py-2 border border-white/5">
                  <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">分镜</div>
                  <div className="font-mono font-bold text-sm">{item.segments.length}</div>
                </div>
                <div className="text-center bg-white/5 rounded-xl px-4 py-2 border border-white/5">
                  <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">节奏感</div>
                  <div className="font-mono font-bold text-sm text-emerald-400">{item.pace}</div>
                </div>
                <div className="text-center bg-white/5 rounded-xl px-4 py-2 border border-white/5">
                  <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">日期</div>
                  <div className="font-mono font-bold text-sm flex items-center gap-1"><Clock size={12}/> {new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => { setState(s => ({ ...s, analysis: item })); navigate(ViewType.ANALYSIS); }}
                className="w-24 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-gray-200 transition-all"
              >
                查看
              </button>
              <button 
                onClick={() => handleReplicate(item)}
                className="w-24 py-2 border border-violet-500/30 text-violet-400 rounded-lg text-xs font-bold hover:bg-violet-600/10 transition-all"
              >
                复刻
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const renderAssets = () => (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(ViewType.HOME)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold">灵感素材库</h2>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-white/5 p-1 rounded-xl">
              <button className="px-4 py-1.5 bg-white/10 rounded-lg text-xs font-bold">全部 {state.assets.length}</button>
              <button className="px-4 py-1.5 text-xs text-gray-500 font-bold hover:text-white transition-all">钩子镜头</button>
              <button className="px-4 py-1.5 text-xs text-gray-500 font-bold hover:text-white transition-all">痛点场景</button>
              <button className="px-4 py-1.5 text-xs text-gray-500 font-bold hover:text-white transition-all">产品特写</button>
           </div>
           <button className="p-2 bg-violet-600 rounded-xl hover:bg-violet-500 transition-all"><Plus size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {state.assets.map((asset) => (
          <div key={asset.id} className="glass-panel group p-3 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all flex flex-col gap-3">
            <div className="aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden relative">
              <img src={asset.thumbnail} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] font-mono">{asset.time}</div>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <Sparkles className="text-violet-400" size={32} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">{asset.hook_type}</span>
                <span className="text-[10px] text-gray-500 font-medium truncate max-w-[80px]">{asset.niche}</span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{asset.voiceover_text}</p>
              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] text-gray-600 italic truncate max-w-[100px]">来自: {asset.sourceTitle}</span>
                <button className="p-1 text-gray-500 hover:text-white"><Download size={12}/></button>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all pt-1">
              <button className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold border border-white/10 transition-all">引用节奏</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <button onClick={() => navigate(ViewType.HOME)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
        <ChevronLeft size={20} /> 返回首页
      </button>
      
      <StepIndicator step={1} />

      <h2 className="text-2xl font-bold mb-8 text-center text-white">分析爆款视频</h2>

      <div className="flex items-center justify-center gap-1 mb-8 bg-white/5 p-1 rounded-2xl self-center max-w-fit mx-auto">
        <button 
          onClick={() => setUploadTab('file')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${uploadTab === 'file' ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <UploadIcon size={16} /> 本地上传
        </button>
        <button 
          onClick={() => setUploadTab('link')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${uploadTab === 'link' ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <LinkIcon size={16} /> 链接分析
        </button>
      </div>

      <div 
        className={`relative border-2 border-dashed rounded-[2.5rem] p-12 transition-all flex flex-col items-center justify-center min-h-[400px] ${state.status === ProjectStatus.UPLOADING ? 'border-violet-600 bg-violet-600/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if(uploadTab === 'file') onUploadStart(); }}
      >
        {uploadTab === 'file' ? (
          <>
            <div className="w-20 h-20 bg-violet-600/10 rounded-full flex items-center justify-center mb-6 text-violet-500">
              <UploadIcon size={40} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-center">点击上传或拖拽视频至此</h3>
            <p className="text-gray-500 text-sm mb-8 text-center">支持 MP4/MOV, 时长建议 &lt; 60秒</p>
            
            <input type="file" className="hidden" id="file-upload" onChange={onUploadStart} />
            <label htmlFor="file-upload" className="px-10 py-3.5 bg-white text-black font-extrabold rounded-xl cursor-pointer hover:bg-gray-200 transition-all shadow-xl active:scale-95">
              选择文件
            </label>
          </>
        ) : (
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-violet-600/10 rounded-full flex items-center justify-center mb-6 mx-auto text-violet-500">
              <LinkIcon size={40} />
            </div>
            <h3 className="text-lg font-bold mb-2">粘贴视频链接</h3>
            <p className="text-gray-500 text-sm mb-8 italic">支持 TikTok、抖音、Instagram 等主流平台链接</p>
            
            <div className={`relative transition-all group ${errorMessage ? 'animate-shake' : ''}`}>
              <input 
                type="text" 
                placeholder="https://..."
                className={`w-full bg-white/5 border ${errorMessage ? 'border-red-500' : 'border-white/10 group-focus-within:border-violet-500'} rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-violet-500/20 outline-none transition-all`}
                value={videoLink}
                onChange={(e) => { setVideoLink(e.target.value); setErrorMessage(null); }}
              />
              {errorMessage && (
                <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-center gap-1.5 text-red-400 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={14} /> {errorMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {state.status === ProjectStatus.UPLOADING && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-bold text-violet-400">{uploadTab === 'file' ? '正在上传文件 65%' : '正在获取视频内容...'}</p>
          </div>
        )}
      </div>

      <div className="mt-12 space-y-4">
        {uploadTab === 'file' && (
          <div className="flex items-center justify-between p-4 glass-panel rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500"><Play size={20} /></div>
              <div>
                <div className="text-sm font-bold">参考样片.mp4</div>
                <div className="text-[10px] text-gray-500 font-mono uppercase">15.4 MB · 00:15</div>
              </div>
            </div>
            <button className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18} /></button>
          </div>
        )}

        <label className="flex items-center gap-3 px-2 cursor-pointer group select-none">
          <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-transparent text-violet-600 focus:ring-violet-600" defaultChecked />
          <span className="text-sm text-gray-400 group-hover:text-white transition-colors">同步保存分镜到我的私有素材库</span>
        </label>

        <button 
          onClick={uploadTab === 'file' ? handleStartAnalysis : handleLinkAnalysis}
          disabled={state.status !== ProjectStatus.IDLE || (uploadTab === 'link' && !videoLink.trim())}
          className={`w-full bg-violet-600 hover:bg-violet-500 text-white font-extrabold py-4.5 rounded-2xl transition-all shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg`}
        >
          {state.status === ProjectStatus.ANALYZING ? (
            <><Sparkles className="animate-pulse" /> AI 正在深度解构中...</>
          ) : (
            <>开始智能分析 <ArrowRight size={22} /></>
          )}
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );

  const [activeTab, setActiveTab] = useState<'segments' | 'formula'>('segments');

  const renderAnalysis = () => (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <button onClick={() => navigate(ViewType.UPLOAD)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8">
        <ChevronLeft size={20} /> 重新分析
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Preview Column */}
        <div className="md:col-span-4">
          <div className="aspect-[9/16] bg-gray-900 rounded-[2.5rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden relative group">
            <img src={state.analysis?.segments[0]?.thumbnail || "https://picsum.photos/400/711?random=123"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Play fill="white" size={48} />
            </div>
            <div className="absolute bottom-6 left-6 text-white text-xs font-bold bg-black/40 backdrop-blur px-3 py-1 rounded-full">00:15</div>
          </div>
        </div>

        {/* Content Column */}
        <div className="md:col-span-8 flex flex-col">
          <div className="flex bg-white/5 p-1 rounded-xl mb-8 self-start">
            <button 
              onClick={() => setActiveTab('segments')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'segments' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
            >
              分镜拆解
            </button>
            <button 
              onClick={() => setActiveTab('formula')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'formula' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
            >
              爆款公式
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {activeTab === 'segments' ? (
              <div className="grid grid-cols-2 gap-4">
                {state.analysis?.segments.map((seg, i) => (
                  <div key={i} className="glass-panel p-3 rounded-2xl border border-white/5 flex flex-col gap-3">
                    <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                       <img src={seg.thumbnail} className="w-full h-full object-cover" />
                       <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur rounded text-[10px] font-mono">{seg.time}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">{seg.hook_type}</div>
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{seg.voiceover_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <GlassCard className="space-y-8 bg-violet-600/5 border-violet-500/10">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">结构公式</h4>
                  <div className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    {state.analysis?.structure || "痛点场景 + 解决方案 + 信任背书 + 限时行动"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">分镜节奏</h4>
                    <p className="font-bold">{state.analysis?.pace || "2.1秒 / 镜头 (高频切换)"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">核心元素</h4>
                    <p className="font-bold">{state.analysis?.core_elements || "大字报标题 + 对比线条"}</p>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          <div className="mt-8 flex gap-4">
            <button 
              onClick={() => state.analysis && handleExportJianying(state.analysis)}
              className="flex-1 px-6 py-4 border border-white/10 rounded-2xl text-sm font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              <FileJson size={18} className="text-blue-400" /> 导出剪映工程
            </button>
            <button 
              onClick={() => navigate(ViewType.SETUP)}
              className="flex-1 px-6 py-4 bg-violet-600 hover:bg-violet-500 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2"
            >
              下一步：开始复刻 <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <button onClick={() => navigate(ViewType.ANALYSIS)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
        <ChevronLeft size={20} /> 调整分析
      </button>

      <StepIndicator step={2} />

      <div className="space-y-8">
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">原分镜参考 (我们将保留骨架进行替换)</h3>
          <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
            {state.analysis?.segments.map((seg, i) => (
              <div key={i} className="min-w-[140px] aspect-video rounded-xl bg-gray-800 border border-white/5 overflow-hidden flex-shrink-0 relative">
                <img src={seg.thumbnail} className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">分镜 {i+1}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-violet-400 mt-2 font-medium italic">"系统将自动保留爆款节奏，替换分镜中的产品特写"</p>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold block">1. 商品名称</label>
            <input 
              type="text" 
              placeholder="例如：极光黑 智能降噪耳机"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-violet-600 outline-none"
              value={state.productInfo.name}
              onChange={e => setState(s => ({ ...s, productInfo: { ...s.productInfo, name: e.target.value } }))}
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold block">2. 商品卖点 (1-3个)</label>
            <div className="space-y-2">
              {state.productInfo.sellingPoints.map((sp, idx) => (
                <input 
                  key={idx}
                  type="text" 
                  placeholder={`卖点 ${idx + 1}，如“持久防水”`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-violet-600 outline-none"
                  value={sp}
                  onChange={e => {
                    const newSps = [...state.productInfo.sellingPoints];
                    newSps[idx] = e.target.value;
                    setState(s => ({ ...s, productInfo: { ...s.productInfo, sellingPoints: newSps } }));
                  }}
                />
              ))}
              {state.productInfo.sellingPoints.length < 3 && (
                <button 
                  onClick={() => setState(s => ({ ...s, productInfo: { ...s.productInfo, sellingPoints: [...s.productInfo.sellingPoints, ''] } }))}
                  className="text-xs text-violet-400 font-bold flex items-center gap-1 hover:text-violet-300"
                >
                  <Plus size={14} /> 添加卖点
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold block">3. 商品图片 (支持 0-10 张)</label>
            <div className="grid grid-cols-5 gap-3">
              <button className="aspect-square bg-white/5 border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-violet-500/50 hover:bg-violet-600/5 transition-all">
                <Plus size={20} />
                <span className="text-[10px]">添加图片</span>
              </button>
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-square bg-gray-800 rounded-xl overflow-hidden relative border border-white/10">
                   <img src={`https://picsum.photos/100/100?random=${i+50}`} className="w-full h-full object-cover" />
                   <button className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white/50 hover:text-red-500"><Trash2 size={10}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold">4. 生成视频数量</label>
              <span className="text-sm font-mono text-violet-400">{state.genCount} 个版本</span>
            </div>
            <input 
              type="range" min="1" max="5" 
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-600"
              value={state.genCount}
              onChange={e => setState(s => ({ ...s, genCount: parseInt(e.target.value) }))}
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-bold">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        </section>

        <button 
          onClick={handleGenerate}
          disabled={!state.productInfo.name || state.status === ProjectStatus.GENERATING}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {state.status === ProjectStatus.GENERATING ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> AI 正在极速生成多版本中...</>
          ) : (
            <>一键复刻爆款视频 <Sparkles size={20} /></>
          )}
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="max-w-4xl mx-auto py-12 px-6 text-center">
      <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="text-3xl font-bold mb-2">生成成功！</h2>
      <p className="text-gray-500 mb-12">系统已根据您的产品卖点生成了 {state.results.length} 个爆款复刻版本</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {state.results.map((res, i) => (
          <div key={res.id} className="glass-panel p-4 rounded-[2rem] text-left border border-white/5 hover:border-violet-500/20 transition-all flex flex-col gap-4 group">
            <div className="aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden relative">
              <img src={res.thumbnail} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play fill="white" size={32} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold">{res.version}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Ready</span>
              </div>
              <p className="text-[10px] text-gray-500">卖点：{res.sellingPoint}</p>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all">播放</button>
              <button className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold transition-all"><Download size={14} className="inline mr-1"/> 下载</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        <button className="px-8 py-4 border border-white/10 rounded-2xl text-sm font-bold hover:bg-white/5 transition-all">批量打包下载 (ZIP)</button>
        <button onClick={() => navigate(ViewType.SETUP)} className="px-8 py-4 border border-violet-500/20 text-violet-400 rounded-2xl text-sm font-bold hover:bg-violet-500/10 transition-all">再次生成</button>
        <button onClick={() => navigate(ViewType.HOME)} className="px-8 py-4 bg-white text-black rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all">返回首页</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-violet-600/30">
      {/* Navigation Header */}
      <header className="h-20 border-b border-white/5 backdrop-blur-xl sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(ViewType.HOME)}>
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">SmartClip AI</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => navigate(ViewType.HOME)} className={`text-sm font-bold transition-all ${state.currentView === ViewType.HOME ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>首页</button>
          <button onClick={() => navigate(ViewType.HISTORY)} className={`text-sm font-bold transition-all ${state.currentView === ViewType.HISTORY ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>我的历史</button>
          <button onClick={() => navigate(ViewType.ASSETS)} className={`text-sm font-bold transition-all ${state.currentView === ViewType.ASSETS ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>素材库</button>
        </nav>

        <div className="flex items-center gap-4">
           <button className="p-2 text-gray-400 hover:text-white transition-colors"><Settings size={20}/></button>
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 border border-white/20"></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
        {state.currentView === ViewType.HOME && renderHome()}
        {state.currentView === ViewType.UPLOAD && renderUpload()}
        {state.currentView === ViewType.ANALYSIS && renderAnalysis()}
        {state.currentView === ViewType.SETUP && renderSetup()}
        {state.currentView === ViewType.SUCCESS && renderSuccess()}
        {state.currentView === ViewType.HISTORY && renderHistory()}
        {state.currentView === ViewType.ASSETS && renderAssets()}
      </main>

      <footer className="py-12 px-8 border-t border-white/5 mt-20 text-center">
        <p className="text-gray-600 text-xs">© 2025 SmartClip AI. Powered by Gemini Core 3.0</p>
      </footer>
    </div>
  );
}

