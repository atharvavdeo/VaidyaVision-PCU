'use client';

import { motion } from 'framer-motion';
import { Database, Eye, Brain, Activity, Bone, Microscope, Wind } from 'lucide-react';

const datasets = [
  {
    anatomy: "Lung",
    source: "NIH ChestX-ray14",
    icon: Wind,
    labels: ["Pneumonia", "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Nodule"],
    count: "112,120 Images"
  },
  {
    anatomy: "Skin",
    source: "HAM10000",
    icon: Activity, 
    labels: ["Melanoma", "Nevus", "Basal Cell Carcinoma", "Actinic Keratosis"],
    count: "10,015 Images"
  },
  {
    anatomy: "Eye",
    source: "Retina DR / APTOS",
    icon: Eye,
    labels: ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"],
    count: "3,662 Images"
  },
  {
    anatomy: "Bone",
    source: "MURA (Stanford)",
    icon: Bone,
    labels: ["Normal", "Abnormal (Fracture)", "Dislocation", "Hardware"],
    count: "40,561 Images"
  },
  {
    anatomy: "Brain",
    source: "Br35H / Kaggle",
    icon: Brain,
    labels: ["Glioma", "Meningioma", "Pituitary Tumor", "No Tumor"],
    count: "3,000+ Scans"
  },
  {
    anatomy: "Microscopy",
    source: "NCT-CRC-HE-100K",
    icon: Microscope,
    labels: ["Adipose", "Lymphocytes", "Mucus", "Tumor Stroma"],
    count: "100,000 Tiles"
  }
];

export default function DatasetsSection() {
  return (
    <section id="datasets" className="relative z-10 py-24 bg-white w-full overflow-hidden">
      <div className="w-full px-4 mb-12">
        {/* Section Header */}
        <div>
          <h2 className="text-[5vw] leading-[0.9] font-bold text-black tracking-tighter uppercase mb-6">
            Trained on <br />
            <span className="text-gray-400">Global Medical Data</span>
          </h2>
        </div>
      </div>

      {/* The Grid - End to End */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 border-t border-b border-black/10">
          {datasets.map((ds, i) => (
            <motion.div
              key={ds.anatomy}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative overflow-hidden bg-white p-8 hover:bg-[#fcfdfc] transition-colors duration-500 border-r border-black/10 last:border-r-0 h-full flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-40 transition-opacity duration-500">
                <ds.icon className="w-24 h-24 text-black -rotate-12 group-hover:text-[#166534] transition-colors duration-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <span className="px-3 py-1 rounded-full border border-black/10 bg-white text-black text-xs font-mono tracking-widest uppercase group-hover:border-[#4d8c55] group-hover:text-[#4d8c55] transition-colors duration-300">
                     {ds.source}
                   </span>
                </div>
                
                <h3 className="text-4xl font-bold text-black mb-2">{ds.anatomy}</h3>
                <p className="text-gray-500 font-mono text-sm mb-8 group-hover:text-[#4d8c55] font-semibold transition-colors duration-300">
                    {ds.count}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {ds.labels.map((label) => (
                    <span key={label} className="text-xs text-black border border-black/5 px-2 py-1 rounded bg-white group-hover:border-[#4d8c55]/30 transition-colors">
                      {label}
                    </span>
                  ))}
                  <span className="text-xs text-black/50 px-2 py-1 group-hover:text-[#4d8c55] transition-colors">+ More</span>
                </div>
              </div>
            </motion.div>
          ))}
      </div>
    </section>
  );
}
