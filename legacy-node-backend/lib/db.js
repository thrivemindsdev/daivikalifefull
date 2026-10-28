import Product from '@/models/Product';
import User from '@/models/User';
import Category from '@/models/Category';
import Banner from '@/models/Banner';
import PopularSearch from '@/models/PopularSearch';
import Collection from '@/models/Collection';
import Size from '@/models/Size';
import ProductGroup from '@/models/ProductGroup';
import Order from '@/models/Order';
import bcrypt from 'bcryptjs';
import { envAdmin } from '@/lib/security-config';
import { ensureDatabaseSchema } from '@/lib/ensure-tables';

import fs from 'fs';
import path from 'path';

import { categories as defaultCategories, products as defaultProducts } from '@/data/products';

const customProductsFilePath = path.join(process.cwd(), 'data', 'custom_products.json');

const loadCustomProducts = () => {
  try {
    if (fs.existsSync(customProductsFilePath)) {
      const data = fs.readFileSync(customProductsFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom products file:', e);
  }
  return [];
};

export const saveMemoryProducts = () => {
  try {
    const dir = path.dirname(customProductsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(customProductsFilePath, JSON.stringify(memoryProducts, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save memoryProducts to file:', e);
  }
};

const customCategoriesFilePath = path.join(process.cwd(), 'data', 'custom_categories.json');

const loadCustomCategories = () => {
  try {
    if (fs.existsSync(customCategoriesFilePath)) {
      const data = fs.readFileSync(customCategoriesFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom categories file:', e);
  }
  return [];
};

export const saveMemoryCategories = () => {
  try {
    const dir = path.dirname(customCategoriesFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(customCategoriesFilePath, JSON.stringify(memoryCategories, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save memoryCategories to file:', e);
  }
};

const customOrdersFilePath = path.join(process.cwd(), 'data', 'custom_orders.json');

const loadCustomOrders = () => {
  try {
    if (fs.existsSync(customOrdersFilePath)) {
      const data = fs.readFileSync(customOrdersFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom orders file:', e);
  }
  return [];
};

export const saveMemoryOrders = () => {
  try {
    const dir = path.dirname(customOrdersFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(customOrdersFilePath, JSON.stringify(memoryOrders, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save memoryOrders to file:', e);
  }
};

const customCollectionsFilePath = path.join(process.cwd(), 'data', 'custom_collections.json');

const loadCustomCollections = () => {
  try {
    if (fs.existsSync(customCollectionsFilePath)) {
      const data = fs.readFileSync(customCollectionsFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom collections file:', e);
  }
  return [];
};

export const saveMemoryCollections = () => {
  try {
    const dir = path.dirname(customCollectionsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(customCollectionsFilePath, JSON.stringify(memoryCollections, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save memoryCollections to file:', e);
  }
};

export const memoryOrders = loadCustomOrders();
export const memoryProductGroups = [];
export const memoryCollections = loadCustomCollections();
export const memorySizes = [];
export const memoryCategories = loadCustomCategories();
export const memoryProducts = loadCustomProducts();
const customBannersFilePath = path.join(process.cwd(), 'data', 'custom_banners.json');

// Static default banners removed — only DB/file banners are served

const loadCustomBanners = () => {
  try {
    if (fs.existsSync(customBannersFilePath)) {
      const data = fs.readFileSync(customBannersFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom banners file:', e);
  }
  return []; // No static fallback — return empty so hero section stays hidden
};

export const saveMemoryBanners = () => {
  try {
    const dir = path.dirname(customBannersFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(customBannersFilePath, JSON.stringify(memoryBanners, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save memoryBanners to file:', e);
  }
};

export const memoryBanners = loadCustomBanners();

export const memoryReviews = [];

const offlineAdmin = envAdmin();
export const memoryUsers = offlineAdmin.configured ? [
  {
    _id: 'mem_admin_001',
    name: offlineAdmin.name,
    email: offlineAdmin.email,
    phone: offlineAdmin.phone,
    password: bcrypt.hashSync(offlineAdmin.password, 10),
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=SP&background=4caf50&color=fff&bold=true',
    createdAt: new Date().toISOString()
  }
] : [];

const customSettingsFilePath = path.join(process.cwd(), 'data', 'custom_settings.json');

const loadCustomSettings = () => {
  try {
    if (fs.existsSync(customSettingsFilePath)) {
      const data = fs.readFileSync(customSettingsFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom settings file:', e);
  }
  return [
    { key: 'free_shipping_threshold', value: 600 },
    { key: 'cod_settings', value: { enabled: true, advancePercent: 30 } }
  ];
};

export const saveMemorySettings = () => {
  try {
    const dir = path.dirname(customSettingsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(customSettingsFilePath, JSON.stringify(memorySettings, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save memorySettings to file:', e);
  }
};

export const memoryContactMessages = [];
export const memoryNewsletterSubscribers = [];
export const memoryNotifications = [];
export const memorySettings = loadCustomSettings();


import { prisma } from './prisma';

export let isDatabaseConnected = false;

let connectionPromise = null;
let lastConnectFailureAt = 0;
const CONNECT_RETRY_MS = 30000;

export const connectDB = async () => {
  if (isDatabaseConnected) {
    return prisma;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('your_password_here')) {
    isDatabaseConnected = false;
    return null;
  }

  // After a failed attempt, wait before trying again: otherwise every request would sit through a full
  // connection timeout while the database is down, making the whole site slow.
  if (!connectionPromise && Date.now() - lastConnectFailureAt < CONNECT_RETRY_MS) {
    return null;
  }

  if (!connectionPromise) {
    connectionPromise = prisma.$connect()
      .then(async () => {
        isDatabaseConnected = true;
        console.log('\n🚀 PostgreSQL (Prisma) Connected Successfully!');

        // Automatically ensure all PostgreSQL tables exist
        await ensureDatabaseSchema(prisma);

        // Ensure default admin exists
        // Only when ADMIN_EMAIL / ADMIN_PASSWORD are configured (never a default password in production)
        const envAdminAccount = envAdmin();
        if (!global.adminChecked && envAdminAccount.configured) {
          const adminEmail = envAdminAccount.email;
          const adminPassword = envAdminAccount.password;
          const adminName = envAdminAccount.name;
          const adminPhone = envAdminAccount.phone;

          const adminExists = await User.findOne({ email: adminEmail });
          
          if (!adminExists) {
            await User.create({
              name: adminName,
              email: adminEmail,
              phone: adminPhone,
              password: adminPassword,
              role: 'admin',
              avatar: 'https://ui-avatars.com/api/?name=SP&background=4caf50&color=fff&bold=true'
            });
            console.log(`🛡️  Security: Default admin account created (${adminEmail})`);
          } else {
            // Ensure admin role and updated password hash
            let needsSave = false;
            if (adminExists.role !== 'admin') {
              adminExists.role = 'admin';
              needsSave = true;
            }
            if (adminPassword) {
              adminExists.password = adminPassword;
              needsSave = true;
            }
            if (needsSave) {
              await adminExists.save();
            }
          }
          global.adminChecked = true;
        }

        return prisma;
      })
      .catch((err) => {
        isDatabaseConnected = false;
        connectionPromise = null;
        lastConnectFailureAt = Date.now();
        console.error('PostgreSQL connection FAILED, running on offline data (changes will not be saved to the database):', err.message);
        return null;
      });
  }

  return connectionPromise;
};
