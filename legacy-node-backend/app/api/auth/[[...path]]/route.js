import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse, publicUser } from '@/lib/api-middleware';
import { jwtSecret, envAdmin } from '@/lib/security-config';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import User from '@/models/User';
import Notification from '@/models/Notification';
import Setting from '@/models/Setting';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { isDatabaseConnected, memoryUsers, memoryNotifications, memorySettings } from '@/lib/db';
import { uploadToCloudinaryOrLocal, deleteFromCloudinary } from '@/lib/cloudinary';
import { NextResponse } from 'next/server';
import { syncVendorUsers } from '@/lib/vendor-store';
import { normalizeIndianMobile, sendOtp, verifyOtp } from '@/lib/sms-otp';

// Finds a non-admin account by mobile number (stored as 98xxxxxxxx, 9198xxxxxxxx or +9198xxxxxxxx).
// Any account (customer, vendor or admin) registered with this 10-digit mobile number
async function findAccountByMobile(mobile) {
  if (!isDatabaseConnected) {
    syncVendorUsers();
    return memoryUsers.find(u => normalizeIndianMobile(u.phone) === mobile) || null;
  }
  return await User.findOne({
    $or: [{ phone: mobile }, { phone: `91${mobile}` }, { phone: `+91${mobile}` }]
  }) || null;
}

const ADMIN_USE_PASSWORD = 'This number belongs to the admin account. Please log in with your password.';

// The admin's number from .env (ADMIN_PHONE) is never used for customer sign-up or OTP password reset
const isEnvAdminMobile = (mobile) => {
  const adminPhone = normalizeIndianMobile(envAdmin().phone);
  return !!adminPhone && adminPhone === mobile;
};
const ACCOUNT_EXISTS = 'An account with this mobile number already exists. Please log in with your password.';
const NO_ACCOUNT = 'No account found with this mobile number. Please sign up first.';

// Customer account created after the sign-up OTP is verified, with the password the customer chose
async function createMobileCustomer(name, mobile, password) {
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06241e&color=fff&bold=true`;
  const welcomeMessage = await getWelcomeMessage(name);

  if (!isDatabaseConnected) {
    const user = {
      _id: 'mem_user_' + Date.now(),
      name,
      email: '',
      phone: mobile,
      password: bcrypt.hashSync(password, 10),
      role: 'user',
      avatar,
      createdAt: new Date().toISOString()
    };
    memoryUsers.push(user);
    memoryNotifications.push({
      _id: 'notif_welcome_' + Date.now(),
      userId: user._id,
      title: 'Welcome to the Daivika Club! ✨',
      message: welcomeMessage,
      type: 'welcome',
      read: false,
      link: '/products',
      createdAt: new Date().toISOString()
    });
    return user;
  }

  const user = await User.create({ name, phone: mobile, password, avatar, role: 'user' });
  try {
    await Notification.create({
      userId: user._id.toString(),
      title: 'Welcome to the Daivika Club! ✨',
      message: welcomeMessage,
      type: 'welcome',
      link: '/products'
    });
  } catch (notifErr) {
    console.warn('Failed to save welcome notification to DB:', notifErr);
  }
  return user;
}

const generateToken = (id) => {
  return jwt.sign({ id: String(id) }, jwtSecret(), { expiresIn: '30d', algorithm: 'HS256' });
};

async function getWelcomeMessage(name) {
  let couponsEnabled = true;
  let coupons = [
    { code: 'Daivika10', discountType: 'percentage', discountValue: 10, minPurchase: 500, usageLimit: 1, category: 'welcome' },
    { code: 'KERALA500', discountType: 'fixed', discountValue: 500, minPurchase: 2000, usageLimit: 2, category: 'festival' },
    { code: 'FIRSTBUY', discountType: 'percentage', discountValue: 20, minPurchase: 1000, usageLimit: 3, category: 'welcome' }
  ];

  try {
    if (!isDatabaseConnected) {
      const enabledSetting = memorySettings.find(s => s.key === 'coupons_enabled');
      if (enabledSetting !== undefined) couponsEnabled = enabledSetting.value;
      const couponsSetting = memorySettings.find(s => s.key === 'coupons');
      if (couponsSetting !== undefined) coupons = couponsSetting.value;
    } else {
      const enabledSetting = await Setting.findOne({ key: 'coupons_enabled' });
      if (enabledSetting) couponsEnabled = enabledSetting.value;
      const couponsSetting = await Setting.findOne({ key: 'coupons' });
      if (couponsSetting) coupons = couponsSetting.value;
    }
  } catch (err) {
    console.warn('Failed to fetch settings for welcome message:', err.message);
  }

  // Find the first welcome coupon
  let welcomeCoupon = null;
  if (couponsEnabled && Array.isArray(coupons)) {
    welcomeCoupon = coupons.find(c => c && c.category && c.category.toLowerCase() === 'welcome');
  }

  if (welcomeCoupon) {
    const discountStr = welcomeCoupon.discountType === 'percentage' 
      ? `${welcomeCoupon.discountValue}%` 
      : `₹${welcomeCoupon.discountValue}`;
    return `We're thrilled to have you, ${name}! As a welcome gift, use coupon code ${welcomeCoupon.code} at checkout to claim ${discountStr} off your first purchase. 🥂`;
  } else {
    return `We're thrilled to have you, ${name}! Welcome to the Daivika Club. Explore our latest smart products and trending deals. 🥂`;
  }
}

// Catch-all GET
export async function GET(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  const action = path[0];

  // GET /api/auth/me
  if (action === 'me') {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse('Not authorized, token failed', 401);
    return jsonResponse(publicUser(user));
  }

  return errorResponse('API endpoint not found', 404);
}

// Catch-all POST
export async function POST(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  const action = path[0];

  // POST /api/auth/register — customers now sign up with mobile number + OTP (send-otp / verify-otp),
  // so email / password registration is closed.
  if (action === 'register') {
    const limited = rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
    if (limited) return limited;
    return errorResponse('Please sign up with your mobile number and OTP.', 400);
  }

  // POST /api/auth/login
  if (action === 'login') {
    try {
      const { email, emailOrPhone, password } = await req.json();
      const inputIdentifier = emailOrPhone || email;
      if (!inputIdentifier || !password) {
        return errorResponse('Please provide email or mobile number, and password', 400);
      }

      const isEmail = inputIdentifier.includes('@');
      const emailVal = isEmail ? inputIdentifier.trim().toLowerCase() : undefined;
      const phoneVal = !isEmail ? inputIdentifier.trim() : undefined;

      const limited = rateLimit(`login-ip:${clientIp(req)}`, 30, 15 * 60 * 1000)
        || rateLimit(`login-id:${emailVal || phoneVal}`, 10, 15 * 60 * 1000);
      if (limited) return limited;

      const adminAccount = envAdmin();
      const envAdminEmail = adminAccount.email;
      const envAdminPassword = adminAccount.password;
      // The admin logs in with ADMIN_PHONE (or ADMIN_EMAIL) + ADMIN_PASSWORD from the server's .env, through the same
      // login form as everyone else; the number matches however it is typed (spaces, +91, 0 prefix)
      const envAdminPhone = normalizeIndianMobile(adminAccount.phone) || adminAccount.phone;
      const envAdminName = adminAccount.name;
      const typedMobile = phoneVal ? (normalizeIndianMobile(phoneVal) || phoneVal) : null;

      // Check if credentials match .env Admin Credentials
      const isEnvAdminLogin = adminAccount.configured && (
        (emailVal && emailVal === envAdminEmail) ||
        (typedMobile && envAdminPhone && typedMobile === envAdminPhone)
      ) && password === envAdminPassword;

      if (isEnvAdminLogin) {
        if (!isDatabaseConnected) {
          let user = memoryUsers.find(u =>
            (emailVal && u.email?.toLowerCase() === envAdminEmail) ||
            (typedMobile && normalizeIndianMobile(u.phone) === envAdminPhone) ||
            u.role === 'admin'
          );
          if (!user) {
            user = {
              _id: 'mem_admin_001',
              name: envAdminName,
              email: envAdminEmail,
              phone: envAdminPhone,
              password: bcrypt.hashSync(envAdminPassword, 10),
              role: 'admin',
              avatar: 'https://ui-avatars.com/api/?name=SP&background=4caf50&color=fff&bold=true',
              createdAt: new Date().toISOString()
            };
            memoryUsers.push(user);
          } else {
            user.role = 'admin';
            user.name = envAdminName;
            user.password = bcrypt.hashSync(envAdminPassword, 10);
            if (emailVal) user.email = envAdminEmail;
            if (envAdminPhone) user.phone = envAdminPhone;
          }

          const userResponse = { ...user };
          delete userResponse.password;
          return jsonResponse({
            ...userResponse,
            token: generateToken(user._id)
          });
        }

        // Database is connected
        let user = await User.findOne({ email: envAdminEmail })
          || (envAdminPhone ? await findAccountByMobile(envAdminPhone) : null);

        if (!user) {
          user = await User.create({
            name: envAdminName,
            email: envAdminEmail,
            ...(envAdminPhone ? { phone: envAdminPhone } : {}),
            password: envAdminPassword,
            role: 'admin',
            avatar: 'https://ui-avatars.com/api/?name=SP&background=4caf50&color=fff&bold=true'
          });
        } else {
          user.role = 'admin';
          user.password = envAdminPassword;
          await user.save();
          // Store ADMIN_PHONE on the admin account so the number is recognised as the admin's everywhere
          if (envAdminPhone && normalizeIndianMobile(user.phone) !== envAdminPhone) {
            await User.findByIdAndUpdate(user._id || user.id, { phone: envAdminPhone })
              .catch(err => console.warn('Could not store ADMIN_PHONE on the admin account:', err.message));
          }
        }

        const userId = user._id || user.id;
        return jsonResponse({
          _id: userId,
          name: user.name,
          email: user.email || '',
          phone: user.phone || '',
          role: 'admin',
          avatar: user.avatar,
          token: generateToken(userId)
        });
      }

      // A 10-digit Indian mobile number matches however it was typed or stored (spaces, +91, 0 prefix)
      const mobile = phoneVal ? normalizeIndianMobile(phoneVal) : null;

      // Memory Cache Fallback
      if (!isDatabaseConnected) {
        syncVendorUsers();
        const user = memoryUsers.find(u =>
          (emailVal && u.email?.toLowerCase() === emailVal) ||
          (phoneVal && (u.phone === phoneVal || (mobile && normalizeIndianMobile(u.phone) === mobile)))
        );
        if (user && bcrypt.compareSync(password, user.password)) {
          const userResponse = { ...user };
          delete userResponse.password;
          return jsonResponse({
            ...userResponse,
            token: generateToken(user._id)
          });
        }
        return errorResponse('Invalid email/mobile number or password.', 401);
      }

      const query = {};
      if (emailVal) {
        query.email = emailVal;
      } else {
        query.phone = phoneVal;
      }

      const user = (mobile && await findAccountByMobile(mobile)) || await User.findOne(query);
      if (user && (await user.matchPassword(password))) {
        const userId = user._id || user.id;
        return jsonResponse({
          _id: userId,
          name: user.name,
          email: user.email || '',
          phone: user.phone || '',
          role: user.role,
          avatar: user.avatar,
          token: generateToken(userId)
        });
      } else {
        return errorResponse('Invalid email/mobile number or password', 401);
      }
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // OTP SMS is only used to prove the number belongs to the customer: once at sign-up and when resetting a
  // forgotten password. Regular login is mobile number + password (POST /api/auth/login), with no SMS.

  // POST /api/auth/send-otp  { phone, purpose: 'signup' | 'reset' }
  if (action === 'send-otp') {
    try {
      const body = await req.json();
      const mobile = normalizeIndianMobile(body.phone || body.emailOrPhone);
      if (!mobile) return errorResponse('Please enter a valid 10-digit mobile number', 400);
      const purpose = body.purpose === 'reset' ? 'reset' : 'signup';

      const limited = rateLimit(`otp-send-ip:${clientIp(req)}`, 20, 60 * 60 * 1000)
        || rateLimit(`otp-send-phone:${mobile}`, 5, 60 * 60 * 1000);
      if (limited) return limited;

      // Checked before sending so no SMS is spent on a request that cannot succeed
      const account = await findAccountByMobile(mobile);
      if (account?.role === 'admin' || isEnvAdminMobile(mobile)) return errorResponse(ADMIN_USE_PASSWORD, 403);
      if (purpose === 'signup' && account) return errorResponse(ACCOUNT_EXISTS, 409);
      if (purpose === 'reset' && !account) return errorResponse(NO_ACCOUNT, 404);

      const result = await sendOtp(mobile);
      if (!result.ok) return errorResponse(result.error, result.status || 500);
      return jsonResponse({ phone: mobile, purpose, expiresInMinutes: result.expiresInMinutes }, 200, { message: 'OTP sent' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // POST /api/auth/verify-otp  { phone, otp, purpose, password, name (sign-up only) }
  // Sign-up creates the account with the chosen password; reset sets a new password. Both log the user in.
  if (action === 'verify-otp') {
    try {
      const body = await req.json();
      const mobile = normalizeIndianMobile(body.phone || body.emailOrPhone);
      const otp = String(body.otp || '').trim();
      if (!mobile || !/^\d{4,8}$/.test(otp)) return errorResponse('Please enter the OTP sent to your mobile', 400);
      const purpose = body.purpose === 'reset' ? 'reset' : 'signup';

      const limited = rateLimit(`otp-verify-ip:${clientIp(req)}`, 30, 15 * 60 * 1000);
      if (limited) return limited;

      // Everything that can be fixed by the user is checked before the OTP, so a typo doesn't use it up
      const account = await findAccountByMobile(mobile);
      if (account?.role === 'admin' || isEnvAdminMobile(mobile)) return errorResponse(ADMIN_USE_PASSWORD, 403);
      if (purpose === 'signup' && account) return errorResponse(ACCOUNT_EXISTS, 409);
      if (purpose === 'reset' && !account) return errorResponse(NO_ACCOUNT, 404);
      const name = String(body.name || '').trim().slice(0, 80);
      if (purpose === 'signup' && !name) return errorResponse('Please enter your name to create your account', 400);
      const password = String(body.password || '');
      if (password.length < 6 || password.length > 128) return errorResponse('Password must be 6 to 128 characters long', 400);

      const check = verifyOtp(mobile, otp);
      if (!check.ok) return errorResponse(check.error, 401);

      let user;
      if (purpose === 'signup') {
        user = await createMobileCustomer(name, mobile, password);
      } else if (!isDatabaseConnected) {
        account.password = bcrypt.hashSync(password, 10);
        user = account;
      } else {
        user = await User.findByIdAndUpdate(account._id || account.id, { password }, { new: true }) || account;
      }
      const userId = user._id || user.id;
      return jsonResponse({
        ...publicUser(user),
        _id: userId,
        token: generateToken(userId)
      }, purpose === 'signup' ? 201 : 200, { message: purpose === 'signup' ? 'Account created' : 'Password updated' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // POST /api/auth/update-avatar
  if (action === 'update-avatar') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) return errorResponse('Not authorized', 401);

      const formData = await req.formData();
      const imageFile = formData.get('image');
      if (!imageFile) return errorResponse('Please select an image to upload', 400);

      // Read image into a buffer
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const avatarUrl = await uploadToCloudinaryOrLocal(buffer, imageFile.name, 'seepo/avatars');

      if (!isDatabaseConnected) {
        const userIndex = memoryUsers.findIndex(u => u._id === user._id);
        if (userIndex !== -1) {
          memoryUsers[userIndex].avatar = avatarUrl;
        }
        return jsonResponse({ avatar: avatarUrl }, 200, { message: 'Profile avatar updated in cache successfully' });
      }

      const dbUser = await User.findById(user._id);
      if (dbUser.avatar) {
        await deleteFromCloudinary(dbUser.avatar);
      }
      dbUser.avatar = avatarUrl;
      await dbUser.save();

      return jsonResponse({ avatar: dbUser.avatar }, 200, { message: 'Profile avatar updated successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  return errorResponse('API endpoint not found', 404);
}

// Catch-all PUT
export async function PUT(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  const action = path[0];

  // PUT /api/auth/update-profile
  if (action === 'update-profile') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) return errorResponse('Not authorized', 401);

      const body = await req.json();
      const name = String(body.name || '').trim().slice(0, 80);
      if (!name) return errorResponse('Name is required', 400);

      if (!isDatabaseConnected) {
        const userIndex = memoryUsers.findIndex(u => u._id === user._id);
        if (userIndex === -1) return errorResponse('User not found in cache', 404);
        memoryUsers[userIndex].name = name;
        const userResponse = { ...memoryUsers[userIndex] };
        delete userResponse.password;
        return jsonResponse(userResponse, 200, { message: 'Profile updated in cache' });
      }

      const dbUser = await User.findById(user._id);
      dbUser.name = name;
      await dbUser.save();

      return jsonResponse(publicUser(dbUser), 200, { message: 'Profile updated successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // PUT /api/auth/update-password
  if (action === 'update-password') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) return errorResponse('Not authorized', 401);

      const { currentPassword, newPassword } = await req.json();
      if (!currentPassword || !newPassword) {
        return errorResponse('Both current and new passwords are required', 400);
      }

      if (newPassword.length < 6) {
        return errorResponse('New password must be at least 6 characters', 400);
      }

      if (!isDatabaseConnected) {
        let cachedUser = memoryUsers.find(u => 
          u._id === user._id || 
          (user.email && u.email?.toLowerCase() === user.email?.toLowerCase())
        );

        if (!cachedUser) {
          return errorResponse('User session not found in memory cache. Please log in again.', 404);
        }

        if (!cachedUser.password) {
          return errorResponse('This account was created via Google / Social Sign-In and does not use a password.', 400);
        }

        let isMatch = false;
        try {
          if (cachedUser.password.startsWith('$2a$') || cachedUser.password.startsWith('$2b$') || cachedUser.password.startsWith('$2y$')) {
            isMatch = bcrypt.compareSync(currentPassword, cachedUser.password);
          } else {
            isMatch = (currentPassword === cachedUser.password);
          }
        } catch (cmpErr) {
          isMatch = false;
        }

        if (!isMatch) {
          return errorResponse('Incorrect current password. Please check and try again.', 401);
        }

        const salt = bcrypt.genSaltSync(10);
        cachedUser.password = bcrypt.hashSync(newPassword, salt);
        return jsonResponse(null, 200, { message: 'Password updated successfully' });
      }

      // MongoDB DB Mode
      const dbUser = await User.findById(user._id).select('+password');
      if (!dbUser) {
        return errorResponse('User account not found', 404);
      }

      if (!dbUser.password) {
        return errorResponse('This account was created via Google / Social Sign-In and does not use a password.', 400);
      }

      const isMatch = await dbUser.matchPassword(currentPassword);
      if (!isMatch) {
        return errorResponse('Incorrect current password. Please check and try again.', 401);
      }

      dbUser.password = newPassword;
      await dbUser.save();

      return jsonResponse(null, 200, { message: 'Password updated successfully' });
    } catch (err) {
      return errorResponse(err.message || 'Failed to update password', 500);
    }
  }

  return errorResponse('API endpoint not found', 404);
}
