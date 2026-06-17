import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  department: String,
  phone: String
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const users = [
  {
    name: 'System Admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    phone: '1234567890'
  },
  {
    name: 'John Staff',
    email: 'staff@example.com',
    password: 'staff123',
    role: 'staff',
    department: 'Road',
    phone: '9876543210'
  },
  {
    name: 'Jane Citizen',
    email: 'citizen@example.com',
    password: 'citizen123',
    role: 'citizen',
    department: null,
    phone: '5555555555'
  },
  {
    name: 'Azhari Jasmine',
    email: 'azhari@19.com',
    password: '123456',
    role: 'citizen',
    department: null,
    phone: '1111111111'
  }
];

const seedUsers = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    for (const userData of users) {
      const exists = await User.findOne({ email: userData.email });
      
      if (exists) {
        console.log(`ℹ️  User already exists: ${userData.email}`);
        // Update password if needed
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        exists.password = hashedPassword;
        exists.role = userData.role;
        exists.department = userData.department;
        await exists.save();
        console.log(`   ✅ Updated: ${userData.name} (${userData.role})\n`);
      } else {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await User.create({
          ...userData,
          password: hashedPassword
        });
        console.log(`✅ Created: ${userData.name} (${userData.role})`);
        console.log(`   📧 Email: ${userData.email}`);
        console.log(`   🔑 Password: ${userData.password}\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All users ready! Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('👨‍💼 ADMIN:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123\n');
    
    console.log('👨‍💻 STAFF (Road Department):');
    console.log('   Email: staff@example.com');
    console.log('   Password: staff123\n');
    
    console.log('👤 CITIZEN 1:');
    console.log('   Email: citizen@example.com');
    console.log('   Password: citizen123\n');
    
    console.log('👤 CITIZEN 2:');
    console.log('   Email: azhari@19.com');
    console.log('   Password: 123456\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedUsers();