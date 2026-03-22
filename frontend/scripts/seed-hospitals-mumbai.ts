import { db } from "../lib/db";
import { hospitals } from "../lib/db/schema";
import { eq } from "drizzle-orm";

// 50 Mumbai hospitals with full address fields
const MUMBAI_HOSPITALS = [
    { code: "KEM", slug: "kem-mumbai", name: "KEM Hospital", type: "hospital" as const, addressLine1: "Acharya Donde Marg, Parel", locality: "Parel", city: "Mumbai", state: "Maharashtra", pincode: "400012", phone: "+91-22-24107000" },
    { code: "JJ", slug: "jj-hospital-mumbai", name: "Sir J.J. Hospital", type: "hospital" as const, addressLine1: "Byculla", locality: "Byculla", city: "Mumbai", state: "Maharashtra", pincode: "400008", phone: "+91-22-23735555" },
    { code: "NAIR", slug: "nair-hospital-mumbai", name: "BYL Nair Hospital", type: "hospital" as const, addressLine1: "Dr. A.L. Nair Road, Mumbai Central", locality: "Mumbai Central", city: "Mumbai", state: "Maharashtra", pincode: "400008", phone: "+91-22-23027700" },
    { code: "SION", slug: "sion-hospital-mumbai", name: "Lokmanya Tilak Municipal General Hospital (Sion)", type: "hospital" as const, addressLine1: "Dr. Babasaheb Ambedkar Road", locality: "Sion", city: "Mumbai", state: "Maharashtra", pincode: "400022", phone: "+91-22-24076381" },
    { code: "COOPER", slug: "cooper-hospital-mumbai", name: "Cooper Hospital", type: "hospital" as const, addressLine1: "Bhakti Vedanta Swami Marg", locality: "Juhu", city: "Mumbai", state: "Maharashtra", pincode: "400056", phone: "+91-22-26207254" },
    { code: "HIND", slug: "hinduja-mumbai", name: "P.D. Hinduja Hospital", type: "hospital" as const, addressLine1: "Veer Savarkar Marg", locality: "Mahim", city: "Mumbai", state: "Maharashtra", pincode: "400016", phone: "+91-22-24451515" },
    { code: "BRCH", slug: "breach-candy-mumbai", name: "Breach Candy Hospital", type: "hospital" as const, addressLine1: "60-A, Bhulabhai Desai Road", locality: "Breach Candy", city: "Mumbai", state: "Maharashtra", pincode: "400026", phone: "+91-22-23667788" },
    { code: "JASLO", slug: "jaslok-mumbai", name: "Jaslok Hospital", type: "hospital" as const, addressLine1: "15, Dr. Deshmukh Marg", locality: "Pedder Road", city: "Mumbai", state: "Maharashtra", pincode: "400026", phone: "+91-22-66573333" },
    { code: "LILA", slug: "lilavati-mumbai", name: "Lilavati Hospital", type: "hospital" as const, addressLine1: "A-791, Bandra Reclamation", locality: "Bandra West", city: "Mumbai", state: "Maharashtra", pincode: "400050", phone: "+91-22-26568000" },
    { code: "KOKILB", slug: "kokilaben-mumbai", name: "Kokilaben Dhirubhai Ambani Hospital", type: "hospital" as const, addressLine1: "Rao Saheb Achutrao Patwardhan Marg", locality: "Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400053", phone: "+91-22-42696969" },
    { code: "NANAVT", slug: "nanavati-mumbai", name: "Nanavati Max Super Speciality Hospital", type: "hospital" as const, addressLine1: "S.V. Road", locality: "Vile Parle West", city: "Mumbai", state: "Maharashtra", pincode: "400056", phone: "+91-22-26267500" },
    { code: "WOCKH", slug: "wockhardt-mumbai", name: "Wockhardt Hospital", type: "hospital" as const, addressLine1: "1877, Dr. Anandrao Nair Marg", locality: "Mumbai Central", city: "Mumbai", state: "Maharashtra", pincode: "400011", phone: "+91-22-61784444" },
    { code: "BOMSC", slug: "bombay-scottish-mumbai", name: "Bombay Hospital", type: "hospital" as const, addressLine1: "12, New Marine Lines", locality: "Marine Lines", city: "Mumbai", state: "Maharashtra", pincode: "400020", phone: "+91-22-22067676" },
    { code: "FORTHS", slug: "fortis-mulund-mumbai", name: "Fortis Hospital Mulund", type: "hospital" as const, addressLine1: "Mulund Goregaon Link Road", locality: "Mulund West", city: "Mumbai", state: "Maharashtra", pincode: "400078", phone: "+91-22-68578888" },
    { code: "FORTHK", slug: "fortis-kalyan", name: "Fortis Hospital Kalyan", type: "hospital" as const, addressLine1: "Haji Bapu Road", locality: "Kalyan West", city: "Thane", state: "Maharashtra", pincode: "421301", phone: "+91-22-67918888" },
    { code: "APOLLON", slug: "apollo-navi-mumbai", name: "Apollo Hospitals Navi Mumbai", type: "hospital" as const, addressLine1: "Plot No. 13, Parsik Hill Road", locality: "CBD Belapur", city: "Navi Mumbai", state: "Maharashtra", pincode: "400614", phone: "+91-22-33503350" },
    { code: "HIRANM", slug: "hiranandani-mumbai", name: "Hiranandani Hospital", type: "hospital" as const, addressLine1: "Hillside Avenue", locality: "Powai", city: "Mumbai", state: "Maharashtra", pincode: "400076", phone: "+91-22-25763300" },
    { code: "SAIFEE", slug: "saifee-mumbai", name: "Saifee Hospital", type: "hospital" as const, addressLine1: "15/17, Maharshi Karve Marg", locality: "Charni Road", city: "Mumbai", state: "Maharashtra", pincode: "400004", phone: "+91-22-67570111" },
    { code: "MASINA", slug: "masina-mumbai", name: "Masina Hospital", type: "hospital" as const, addressLine1: "Sant Savta Marg", locality: "Byculla East", city: "Mumbai", state: "Maharashtra", pincode: "400027", phone: "+91-22-23714817" },
    { code: "CAMA", slug: "cama-mumbai", name: "Cama & Albless Hospital", type: "hospital" as const, addressLine1: "Mahapalika Marg, Fort", locality: "Fort", city: "Mumbai", state: "Maharashtra", pincode: "400001", phone: "+91-22-22620637" },
    { code: "GT", slug: "gt-hospital-mumbai", name: "G.T. Hospital", type: "hospital" as const, addressLine1: "L.T. Marg, Fort", locality: "Fort", city: "Mumbai", state: "Maharashtra", pincode: "400001", phone: "+91-22-22620242" },
    { code: "HOLY", slug: "holy-family-mumbai", name: "Holy Family Hospital", type: "hospital" as const, addressLine1: "St. Andrews Road", locality: "Bandra West", city: "Mumbai", state: "Maharashtra", pincode: "400050", phone: "+91-22-26422222" },
    { code: "RAJAW", slug: "rajawadi-mumbai", name: "Rajawadi Hospital", type: "hospital" as const, addressLine1: "Rajawadi", locality: "Ghatkopar East", city: "Mumbai", state: "Maharashtra", pincode: "400077", phone: "+91-22-25063636" },
    { code: "BHABA", slug: "bhabha-mumbai", name: "Dr. R.N. Cooper Municipal Hospital", type: "hospital" as const, addressLine1: "N.S. Mankikar Marg", locality: "Juhu", city: "Mumbai", state: "Maharashtra", pincode: "400056", phone: "+91-22-26207254" },
    { code: "KASTUR", slug: "kasturba-mumbai", name: "Kasturba Hospital for Infectious Diseases", type: "hospital" as const, addressLine1: "Sane Guruji Marg", locality: "Chinchpokli", city: "Mumbai", state: "Maharashtra", pincode: "400011", phone: "+91-22-23084000" },
    { code: "SEVEN", slug: "seven-hills-mumbai", name: "SevenHills Hospital", type: "hospital" as const, addressLine1: "Marol Maroshi Road", locality: "Andheri East", city: "Mumbai", state: "Maharashtra", pincode: "400059", phone: "+91-22-67676767" },
    { code: "GLOB", slug: "global-mumbai", name: "Global Hospital", type: "hospital" as const, addressLine1: "35, Dr. E. Borges Road", locality: "Parel", city: "Mumbai", state: "Maharashtra", pincode: "400012", phone: "+91-22-67670101" },
    { code: "SRCC", slug: "srcc-children-mumbai", name: "SRCC Children's Hospital", type: "hospital" as const, addressLine1: "Haji Ali", locality: "Mahalaxmi", city: "Mumbai", state: "Maharashtra", pincode: "400034", phone: "+91-22-66627300" },
    { code: "TATA", slug: "tata-memorial-mumbai", name: "Tata Memorial Hospital", type: "hospital" as const, addressLine1: "Dr. Ernest Borges Marg", locality: "Parel", city: "Mumbai", state: "Maharashtra", pincode: "400012", phone: "+91-22-24177000" },
    { code: "RELHN", slug: "reliance-mumbai", name: "Sir H.N. Reliance Foundation Hospital", type: "hospital" as const, addressLine1: "Raja Rammohan Roy Road", locality: "Girgaon", city: "Mumbai", state: "Maharashtra", pincode: "400004", phone: "+91-22-61303030" },
    { code: "ZENHM", slug: "zen-multispeciality-mumbai", name: "Zen Multispeciality Hospital", type: "hospital" as const, addressLine1: "Marine Drive", locality: "Chowpatty", city: "Mumbai", state: "Maharashtra", pincode: "400007", phone: "+91-22-23634444" },
    { code: "SUSHM", slug: "sushrusha-mumbai", name: "Sushrusha Hospital", type: "hospital" as const, addressLine1: "Shivaji Park", locality: "Dadar", city: "Mumbai", state: "Maharashtra", pincode: "400028", phone: "+91-22-24452222" },
    { code: "CRIT", slug: "criticare-mumbai", name: "CritiCare Hospital", type: "hospital" as const, addressLine1: "Linking Road", locality: "Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400053", phone: "+91-22-26730000" },
    { code: "SURYA", slug: "surya-children-mumbai", name: "Surya Children's Hospital", type: "hospital" as const, addressLine1: "Mangaldas Road", locality: "Santacruz West", city: "Mumbai", state: "Maharashtra", pincode: "400054", phone: "+91-22-26610240" },
    { code: "BHATI", slug: "bhatia-mumbai", name: "Bhatia Hospital", type: "hospital" as const, addressLine1: "Tararani Road", locality: "Grant Road", city: "Mumbai", state: "Maharashtra", pincode: "400007", phone: "+91-22-66660000" },
    { code: "PRINCE", slug: "prince-aly-mumbai", name: "Prince Aly Khan Hospital", type: "hospital" as const, addressLine1: "Aga Hall, Nesbit Road", locality: "Mazgaon", city: "Mumbai", state: "Maharashtra", pincode: "400010", phone: "+91-22-23773311" },
    { code: "AMBI", slug: "ambika-nursing-mumbai", name: "Ambika Nursing Home", type: "clinic" as const, addressLine1: "Tilak Road", locality: "Ghatkopar East", city: "Mumbai", state: "Maharashtra", pincode: "400077", phone: "+91-22-25065555" },
    { code: "VEDANN", slug: "vedant-mumbai", name: "Vedant Hospital", type: "hospital" as const, addressLine1: "Jogeshwari-Vikhroli Link Road", locality: "Jogeshwari East", city: "Mumbai", state: "Maharashtra", pincode: "400060", phone: "+91-22-28264444" },
    { code: "SURANA", slug: "surana-sethia-mumbai", name: "Surana Sethia Hospital", type: "hospital" as const, addressLine1: "Lal Bahadur Shastri Road", locality: "Mulund West", city: "Mumbai", state: "Maharashtra", pincode: "400080", phone: "+91-22-25937777" },
    { code: "CNM", slug: "cloudnine-mumbai", name: "Cloudnine Hospital", type: "hospital" as const, addressLine1: "Fun Republic Lane", locality: "Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400053", phone: "+91-22-66783333" },
    { code: "MAXM", slug: "max-multicare-mumbai", name: "Max Multicare Hospital", type: "hospital" as const, addressLine1: "Thane-Belapur Road", locality: "Vashi", city: "Navi Mumbai", state: "Maharashtra", pincode: "400703", phone: "+91-22-27891111" },
    { code: "JUPITM", slug: "jupiter-mumbai", name: "Jupiter Hospital", type: "hospital" as const, addressLine1: "Eastern Express Highway", locality: "Thane West", city: "Thane", state: "Maharashtra", pincode: "400601", phone: "+91-22-25392222" },
    { code: "STER", slug: "sterling-mumbai", name: "Sterling Hospital", type: "hospital" as const, addressLine1: "Hanuman Road", locality: "Vile Parle East", city: "Mumbai", state: "Maharashtra", pincode: "400057", phone: "+91-22-26178888" },
    { code: "RAHEJM", slug: "raheja-mumbai", name: "Raheja Hospital", type: "hospital" as const, addressLine1: "Raheja Rugnalaya Marg", locality: "Mahim West", city: "Mumbai", state: "Maharashtra", pincode: "400016", phone: "+91-22-24440044" },
    { code: "IND12", slug: "inlaks-budhrani-mumbai", name: "Inlaks & Budhrani Hospital", type: "hospital" as const, addressLine1: "Takli Road", locality: "Kopar Khairane", city: "Navi Mumbai", state: "Maharashtra", pincode: "400709", phone: "+91-22-27541880" },
    { code: "VIKRM", slug: "vikram-mumbai", name: "Dr. L.H. Hiranandani Hospital", type: "hospital" as const, addressLine1: "Hillside Avenue", locality: "Powai", city: "Mumbai", state: "Maharashtra", pincode: "400076", phone: "+91-22-25763300" },
    { code: "MEDIC", slug: "medicover-mumbai", name: "Medicover Hospital", type: "hospital" as const, addressLine1: "Andheri-Kurla Road", locality: "Andheri East", city: "Mumbai", state: "Maharashtra", pincode: "400059", phone: "+91-22-68268888" },
    { code: "SPARSH", slug: "sparsh-mumbai", name: "Sparsh Hospital", type: "hospital" as const, addressLine1: "Tilak Road", locality: "Panvel", city: "Navi Mumbai", state: "Maharashtra", pincode: "410206", phone: "+91-22-27460606" },
    { code: "METROPM", slug: "metropolis-diagnostic-mumbai", name: "Metropolis Diagnostic Centre", type: "diagnostic_center" as const, addressLine1: "210, Udyog Bhavan", locality: "Andheri East", city: "Mumbai", state: "Maharashtra", pincode: "400059", phone: "+91-22-33993939" },
    { code: "SUBLB", slug: "suburban-diagnostics-mumbai", name: "Suburban Diagnostics", type: "diagnostic_center" as const, addressLine1: "Turner Road, Lucky Tower", locality: "Bandra West", city: "Mumbai", state: "Maharashtra", pincode: "400050", phone: "+91-22-66767676" },
];

async function main() {
    console.log("🏥 Seeding Mumbai hospitals...");

    let inserted = 0;
    let skipped = 0;

    for (const h of MUMBAI_HOSPITALS) {
        const existing = await db.query.hospitals.findFirst({
            where: eq(hospitals.code, h.code),
        });

        if (existing) {
            skipped++;
            continue;
        }

        await db.insert(hospitals).values({
            code: h.code,
            slug: h.slug,
            name: h.name,
            type: h.type,
            addressLine1: h.addressLine1,
            locality: h.locality,
            city: h.city,
            state: h.state,
            pincode: h.pincode,
            country: "India",
            phone: h.phone,
            isActive: true,
        });
        inserted++;
        console.log(`  ✓ [${h.code}] ${h.name} — ${h.locality}`);
    }

    console.log(`\n✅ Hospital seed complete: ${inserted} inserted, ${skipped} skipped (already exist)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
