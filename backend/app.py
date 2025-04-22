from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import distinct, func
from datetime import datetime, timedelta
from sqlalchemy import and_
from collections import defaultdict
import jwt
#import datetime
import os
import joblib
import numpy as np
import openai



app = Flask(__name__)

# CORS Configuration
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:Amine2025@@db.avgboakdzhkltpwkuezx.supabase.co:5432/postgres'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'YOUR_SECRET_KEY'
db = SQLAlchemy(app)



# Determine the absolute path to your model file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "final_student_model.pkl")

# Load the model
model = joblib.load(MODEL_PATH)
print("Random Forest model loaded successfully!")


exam_type = db.Column(db.String(50), nullable=False)

# Grab the environment variable
env_key = os.getenv("OPENAI_API_KEY")
print("DEBUG: The environment variable is:", env_key)

# Then set it for OpenAI
openai.api_key = env_key

# ----------------------------------------------------
# MODELS (Match Your New Tables in pgAdmin4)
# ----------------------------------------------------
# 1) USERS TABLE
class Users(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)  # hashed password
    role = db.Column(db.Enum('admin', 'teacher', 'student', name='user_role'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())

# 2) STUDENTS TABLE
class Students(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    created_at = db.Column(db.DateTime, default=db.func.now())

# 3) TEACHERS TABLE
class Teachers(db.Model):
    __tablename__ = 'teachers'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    created_at = db.Column(db.DateTime, default=db.func.now())
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'))

# 4) SUBJECTS TABLE
class Subjects(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

# 5) CLASSES TABLE
class Classes(db.Model):
    __tablename__ = 'classes'
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False)
    class_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())

# 6) STUDENT_SUBJECTS TABLE
class StudentSubjects(db.Model):
    __tablename__ = 'student_subjects'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)

# 7) ATTENDANCE TABLE
class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    # date_recorded = db.Column(db.Date, default=db.func.current_date())
    status = db.Column(db.Enum('Present', 'Absent', 'Late', name='attendance_status'), nullable=False)
    recorded_at = db.Column(db.DateTime, default=db.func.now())

# 8) GRADES TABLE
class Grades(db.Model):
    __tablename__ = 'grades'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    exam_type = db.Column(db.String(50), nullable=False)  # now a string instead of enum
    score = db.Column(db.Float, nullable=False)
    recorded_at = db.Column(db.DateTime, default=db.func.now())

# 9) PARTICIPATION TABLE
class Participation(db.Model):
    __tablename__ = 'participation'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    week_number = db.Column(db.Integer, nullable=False)
    participation_score = db.Column(db.Float, nullable=False)
    recorded_at = db.Column(db.DateTime, default=db.func.now())

# 10) HOMEWORK TABLE (Updated)
class Homework(db.Model):
    __tablename__ = 'homework'
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)  # New field
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    file_path = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=db.func.now())


# 11) MESSAGES TABLE (Updated)
class Messages(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=db.func.now())
    is_read = db.Column(db.Boolean, default=False)  # New column for read status


# ----------------------------------------------------
def predict_final_grade(attendance_percent, participation_percent, past_grade):
    # Our model expects a 2D array: [[attendance, participation, past_grade]]
    features = [[attendance_percent, participation_percent, past_grade]]
    prediction = model.predict(features)
    # prediction is a list or array; we’ll return the first value
    return float(prediction[0])

# ----------------------------------------------------





# ----------------------------------------------------
# ROUTES
# ----------------------------------------------------
@app.route("/")
def home():
    return jsonify({"message": "Welcome to the Student Performance System!"})

# --------------------------
# AUTH / LOGIN
# --------------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = Users.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    # If valid, check if user is teacher or student
    teacher_id_to_return = None
    student_id_to_return = None

    if user.role == "teacher":
        teacher_obj = Teachers.query.filter_by(user_id=user.id).first()
        if teacher_obj:
            teacher_id_to_return = teacher_obj.id
    elif user.role == "student":
        student_obj = Students.query.filter_by(user_id=user.id).first()
        if student_obj:
            student_id_to_return = student_obj.id

    return jsonify({
        "message": "Login successful!",
        "user_id": user.id,      # The user table PK
        "name": user.name,
        "role": user.role,
        "teacher_id": teacher_id_to_return,   # The teachers table PK
        "student_id": student_id_to_return    # The students table PK
    }), 200


# --------------------------
# REGISTER / CREATE USERS
# --------------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "student")  # default student
    if not all([name, email, password, role]):
        return jsonify({"error": "Missing fields"}), 400
    # Check if email already exists
    existing_user = Users.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 400
    # Hash password
    hashed_pw = generate_password_hash(password)
    new_user = Users(
        name=name,
        email=email,
        password=hashed_pw,
        role=role
    )
    db.session.add(new_user)
    db.session.commit()
    # If role=student, create a record in Students
    if role == "student":
        new_student = Students(user_id=new_user.id)
        db.session.add(new_student)
    # If role=teacher, create a record in Teachers
    elif role == "teacher":
        new_teacher = Teachers(user_id=new_user.id)
        db.session.add(new_teacher)
    # If role=admin, no extra table needed (unless you want an Admin table)
    db.session.commit()
    return jsonify({"message": f"{role.capitalize()} registered successfully!"}), 201

# --------------------------
# ADD TEACHER (ADMIN)
# --------------------------
@app.route("/admin/add-teacher", methods=["POST"])
def add_teacher():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    subject_id = data.get("subject_id")  # Expect the front end to send the subject ID

    if not all([name, email, password, subject_id]):
        return jsonify({"error": "Name, email, password, and subject_id are required"}), 400

    # Check if email already exists
    existing_user = Users.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 400

    try:
        # 1) Create user (role=teacher)
        hashed_pw = generate_password_hash(password)
        new_user = Users(
            name=name,
            email=email,
            password=hashed_pw,
            role="teacher"
        )
        db.session.add(new_user)
        db.session.flush()  # Flush to obtain new_user.id

        # 2) Create teacher referencing new_user.id and set subject_id
        new_teacher = Teachers(
            user_id=new_user.id,
            subject_id=subject_id  # Save the teacher's subject assignment
        )
        db.session.add(new_teacher)
        db.session.flush()  # Flush to get new_teacher.id

        # 3) Create a default class for this teacher and subject
        default_class = Classes(
            subject_id=subject_id,
            teacher_id=new_teacher.id,
            class_number=1  # This is the first class for this teacher in this subject
        )
        db.session.add(default_class)

        # 4) Commit everything at once
        db.session.commit()

        return jsonify({"message": "Teacher added successfully!"}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding teacher: {str(e)}")
        return jsonify({"error": "Failed to add teacher"}), 500


# --------------------------
# EDIT TEACHER (ADMIN)
# --------------------------
@app.route("/admin/update-teacher/<int:teacher_id>", methods=["PUT"])
def update_teacher(teacher_id):
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    subject_id = data.get("subject_id")

    teacher = Teachers.query.get(teacher_id)
    if not teacher:
        return jsonify({"error": "Teacher not found"}), 404

    user = Users.query.get(teacher.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Update user details
    if name:
        user.name = name
    if email:
        user.email = email
    if password:
        user.password = generate_password_hash(password)
    if subject_id:
        teacher.subject_id = subject_id

    db.session.commit()
    return jsonify({"message": "Teacher updated successfully!"}), 200

# --------------------------
# DELETE TEACHER (ADMIN)
# --------------------------
@app.route("/admin/delete-teacher/<int:teacher_id>", methods=["DELETE"])
def delete_teacher(teacher_id):
    teacher = Teachers.query.get(teacher_id)
    if not teacher:
        return jsonify({"error": "Teacher not found"}), 404

    user = Users.query.get(teacher.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(teacher)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Teacher deleted successfully!"}), 200

# --------------------------
# ADD STUDENT (ADMIN)
# --------------------------
# -------------------------- Helper Function --------------------------

def get_class_id_for_subject(subject_id):
    """
    Returns the class ID for a given subject by finding an existing class with fewer than 20 students.
    If all classes are full or none exist, creates a new class with an incremented class_number.
    """
    classes = Classes.query.filter_by(subject_id=subject_id).order_by(Classes.class_number).all()
    for cls in classes:
        count = StudentSubjects.query.filter_by(class_id=cls.id).count()
        if count < 20:
            return cls.id
    # No available class – create a new one.
    new_class_number = 1
    if classes:
        new_class_number = classes[-1].class_number + 1
    teacher = Teachers.query.filter_by(subject_id=subject_id).first()
    teacher_id = teacher.id if teacher else 1
    new_class = Classes(subject_id=subject_id, teacher_id=teacher_id, class_number=new_class_number)
    db.session.add(new_class)
    db.session.flush()  # Ensure new_class.id is generated
    return new_class.id

# -------------------------- ADD STUDENT (ADMIN) Endpoint --------------------------

@app.route("/admin/add-student", methods=["POST"])
def add_student():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    subjects = data.get("subjects", [])  # List of subject IDs the student selects

    if not all([name, email, password]):
        return jsonify({"error": "Name, email, and password are required"}), 400

    # Check if email already exists
    existing_user = Users.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 400

    try:
        # 1) Create the new user (role=student)
        hashed_pw = generate_password_hash(password)
        new_user = Users(name=name, email=email, password=hashed_pw, role="student")
        db.session.add(new_user)
        db.session.flush()  # Ensure new_user.id is available

        # 2) Create the student record referencing new_user.id
        new_student = Students(user_id=new_user.id)
        db.session.add(new_student)
        db.session.flush()  # Ensure new_student.id is available

        # 3) For each subject selected by the student, find or create the appropriate class
        for subject_id in subjects:
            class_id = get_class_id_for_subject(subject_id)
            new_student_subject = StudentSubjects(
                student_id=new_student.id,
                subject_id=subject_id,
                class_id=class_id
            )
            db.session.add(new_student_subject)

        # 4) Commit all changes at once
        db.session.commit()
        return jsonify({"message": "Student added successfully!"}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding student: {str(e)}")
        return jsonify({"error": "Failed to add student due to an internal error"}), 500

# --------------------------
# EDIT STUDENT (ADMIN)
# --------------------------
@app.route("/admin/update-student/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    subjects = data.get("subjects", [])  # List of subject IDs

    student = Students.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    user = Users.query.get(student.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Update user details
    if name:
        user.name = name
    if email:
        user.email = email
    if password:
        user.password = generate_password_hash(password)

    # Update student subjects
    if subjects:
        # Delete existing student subjects
        StudentSubjects.query.filter_by(student_id=student_id).delete()
        # Add new student subjects
        for subject_id in subjects:
            new_student_subject = StudentSubjects(
                student_id=student_id,
                subject_id=subject_id,
                class_id=1  # Default class ID (you can modify this)
            )
            db.session.add(new_student_subject)

    db.session.commit()
    return jsonify({"message": "Student updated successfully!"}), 200

# --------------------------
# DELETE STUDENT (ADMIN)
# --------------------------
@app.route("/admin/delete-student/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    student = Students.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    user = Users.query.get(student.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(student)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Student deleted successfully!"}), 200

# --------------------------
# GET ALL STUDENTS
# --------------------------
@app.route("/students", methods=["GET"])
def get_students():
    students = Students.query.all()
    student_list = []
    for student in students:
        user = Users.query.get(student.user_id)
        if user:
            student_list.append({
                "id": student.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            })
    return jsonify(student_list), 200

# --------------------------
# GET ALL TEACHERS
# --------------------------
@app.route("/teachers", methods=["GET"])
def get_teachers():
    teachers = Teachers.query.all()
    teacher_list = []
    for teacher in teachers:
        user = Users.query.get(teacher.user_id)
        if user:
            teacher_list.append({
                "id": teacher.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "subject_id": teacher.subject_id
            })
    return jsonify(teacher_list), 200

# --------------------------
# GET ALL SUBJECTS
# --------------------------
@app.route("/subjects", methods=["GET"])
def get_subjects():
    subs = Subjects.query.all()
    result = [{"id": s.id, "name": s.name} for s in subs]
    return jsonify(result), 200

# --------------------------
# ADD A SUBJECT
# --------------------------
@app.route("/subjects", methods=["POST"])
def add_subject():
    data = request.get_json() or {}
    name = data.get("name")
    if not name:
        return jsonify({"error": "Subject name is required"}), 400
    # Create new subject
    new_sub = Subjects(name=name)
    db.session.add(new_sub)
    db.session.commit()
    return jsonify({"message": "Subject added successfully!"}), 201




# ------------- TEACHER CLASSES ROUTE -------------
@app.route("/teachers/<int:teacher_id>/classes", methods=["GET"])
def get_teacher_classes(teacher_id):
    teacher = Teachers.query.get(teacher_id)
    if not teacher:
        return jsonify({"error": "Teacher not found"}), 404

    # Fetch all classes for this teacher
    classes = Classes.query.filter_by(teacher_id=teacher_id).all()

    data = []
    for cls in classes:
        subj = Subjects.query.get(cls.subject_id)
        data.append({
            "id": cls.id,
            "subject_id": cls.subject_id,
            "subject_name": subj.name if subj else None,
            "class_number": cls.class_number,
            "created_at": "2025-02-01 12:00:00"  # or cls.created_at if you have that column
        })
    return jsonify(data), 200

# ------------- NEW: GET STUDENTS IN A CLASS -------------
@app.route("/classes/<int:class_id>/students", methods=["GET"])
def get_students_in_class(class_id):
    # Adjust to your real schema. If you store Student->Class in a table, query it
    # Example if we use StudentSubjects with (student_id, subject_id, class_id):
    # Then we filter by class_id.

    # For example:
    student_subjects = StudentSubjects.query.filter_by(class_id=class_id).all()
    data = []
    for ss in student_subjects:
        # find the student
        # we assume there's a Student row referencing user_id etc.
        # adapt to your real code
        # e.g. student = Students.query.get(ss.student_id)
        # user = Users.query.get(student.user_id)
        # We'll just do a dummy example:
        student = Students.query.get(ss.student_id)
        if student:
            user = Users.query.get(student.user_id)
            data.append({
                "student_id": student.id,
                "student_name": user.name if user else None,
                "student_email": user.email if user else None
            })
    return jsonify(data), 200




# -------------------------- NEW: Create New Class Endpoint --------------------------
@app.route("/teachers/create-new-class", methods=["POST"])
def create_new_class():
    data = request.get_json() or {}
    teacher_id = data.get("teacher_id")
    subject_id = data.get("subject_id")

    if teacher_id is None or subject_id is None:
        return jsonify({"error": "Missing teacher_id or subject_id"}), 400

    try:
        teacher_id = int(teacher_id)
        subject_id = int(subject_id)
    except ValueError:
        return jsonify({"error": "Invalid teacher_id or subject_id"}), 400

    # Find existing classes for this teacher and subject
    existing_classes = Classes.query.filter_by(teacher_id=teacher_id, subject_id=subject_id).all()
    if existing_classes:
        max_class_number = max(cls.class_number for cls in existing_classes)
        new_class_number = max_class_number + 1
    else:
        new_class_number = 1

    new_class = Classes(
        subject_id=subject_id,
        teacher_id=teacher_id,
        class_number=new_class_number
    )

    try:
        db.session.add(new_class)
        db.session.commit()
        return jsonify({
            "message": "New class created successfully!",
            "class_id": new_class.id,
            "class_number": new_class.class_number
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create new class", "details": str(e)}), 500
















# -------------------------- New: Add Grade Endpoint --------------------------
@app.route("/grades", methods=["POST"])
def add_grade():
    data = request.get_json() or {}
    app.logger.info("POST /grades payload: %s", data)

    student_id = data.get("student_id")
    subject_id = data.get("subject_id")
    exam_type  = data.get("exam_type")
    score      = data.get("score")

    # Validate required fields (0 is valid so we check for empty string)
    if student_id is None or subject_id is None or not exam_type or score == "":
        app.logger.error("Missing required fields: %s", data)
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Convert score to float and check it's between 0 and 100
        float_score = float(score)
        if float_score < 0 or float_score > 100:
            return jsonify({"error": "Score must be between 0 and 100"}), 400

        # Convert IDs to integers
        student_id = int(student_id)
        subject_id = int(subject_id)

        # Check if a grade record already exists for this exam type
        existing_grade = Grades.query.filter_by(
            student_id=student_id,
            subject_id=subject_id,
            exam_type=exam_type
        ).first()
        if existing_grade:
            return jsonify({"error": "Grade record already exists. Use update grade endpoint."}), 400

        # Insert a new grade row
        new_grade = Grades(
            student_id=student_id,
            subject_id=subject_id,
            exam_type=exam_type,
            score=float_score
        )
        db.session.add(new_grade)
        db.session.commit()
        app.logger.info("Grade added: %s", new_grade.id)
        return jsonify({"message": "Grade added successfully!"}), 201

    except ValueError:
        app.logger.exception("Numeric conversion error")
        return jsonify({"error": "Invalid numeric fields"}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.exception("Error adding grade")
        return jsonify({"error": f"Failed to add grade. {str(e)}"}), 500


# -------------------------- New: Update Grade Endpoint --------------------------
@app.route("/grades", methods=["PUT"])
def update_grade():
    data = request.get_json() or {}
    app.logger.info("PUT /grades payload: %s", data)

    student_id = data.get("student_id")
    subject_id = data.get("subject_id")
    exam_type  = data.get("exam_type")
    score      = data.get("score")

    # Validate required fields (allow 0 as valid)
    if student_id is None or subject_id is None or not exam_type or score == "":
        return jsonify({"error": "Missing required fields"}), 400

    try:
        float_score = float(score)
        if float_score < 0 or float_score > 100:
            return jsonify({"error": "Score must be between 0 and 100"}), 400

        student_id = int(student_id)
        subject_id = int(subject_id)

        # Find the existing grade row for this exam type
        grade_row = Grades.query.filter_by(
            student_id=student_id,
            subject_id=subject_id,
            exam_type=exam_type
        ).first()

        if not grade_row:
            return jsonify({"error": "Grade record not found"}), 404

        grade_row.score = float_score
        db.session.commit()
        app.logger.info("Grade updated for ID: %s", grade_row.id)
        return jsonify({"message": "Grade updated successfully!"}), 200

    except ValueError:
        app.logger.exception("Numeric conversion error")
        return jsonify({"error": "Invalid numeric fields"}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.exception("Error updating grade")
        return jsonify({"error": f"Failed to update grade. {str(e)}"}), 500


# -------------------------- GET Existing Grade Endpoint --------------------------
@app.route("/grades/existing", methods=["GET"])
def get_existing_grade():
    try:
        student_id = request.args.get("student_id")
        subject_id = request.args.get("subject_id")
        exam_type  = request.args.get("exam_type")

        if not student_id or not subject_id or not exam_type:
            return jsonify({"error": "Missing query params"}), 400

        student_id = int(student_id)
        subject_id = int(subject_id)

        grade_row = Grades.query.filter_by(
            student_id=student_id,
            subject_id=subject_id,
            exam_type=exam_type
        ).first()

        if not grade_row:
            return jsonify({"error": "Grade not found"}), 404

        return jsonify({
            "student_id": grade_row.student_id,
            "subject_id": grade_row.subject_id,
            "exam_type": grade_row.exam_type,
            "score": grade_row.score
        }), 200

    except ValueError:
        return jsonify({"error": "Invalid query params"}), 400
    except Exception as e:
        app.logger.exception("Error in get_existing_grade")
        return jsonify({"error": "Internal server error"}), 500



# -------------------------- put Attendance Endpoint --------------------------
@app.route("/attendance", methods=["POST"])
def add_attendance():
    data = request.get_json() or {}
    class_id = data.get("class_id")
    teacher_id = data.get("teacher_id")
    records = data.get("records", [])

    if not class_id or not teacher_id or not records:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        cls = Classes.query.get(class_id)
        if not cls:
            return jsonify({"error": "Invalid class_id"}), 400

        if int(teacher_id) != cls.teacher_id:
            return jsonify({"error": "Teacher does not match the class"}), 403

        subject_id = cls.subject_id

        for record in records:
            if "student_id" not in record or "status" not in record:
                return jsonify({"error": "Each record must include student_id and status"}), 400

            if record["status"] not in ["Present", "Absent", "Late"]:
                return jsonify({"error": "Invalid attendance status"}), 400

            new_attendance = Attendance(
                student_id=int(record["student_id"]),
                subject_id=subject_id,
                status=record["status"]
            )
            db.session.add(new_attendance)

        db.session.commit()
        return jsonify({"message": "Attendance recorded successfully!"}), 201

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error adding attendance: {str(e)}")
        return jsonify({"error": f"Failed to record attendance: {str(e)}"}), 500




# -------------------------- put participation Endpoint --------------------------
@app.route("/participation", methods=["POST"])
def add_participation():
    data = request.get_json() or {}
    class_id = data.get("class_id")
    teacher_id = data.get("teacher_id")
    week_number = data.get("week_number")  # Now provided by the front end
    records = data.get("records", [])
    force_update = data.get("force_update", False)  # New flag to force update duplicates

    if not class_id or not teacher_id or week_number is None or not records:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Retrieve the class to derive subject_id
        cls = Classes.query.get(class_id)
        if not cls:
            return jsonify({"error": "Class not found"}), 404
        subject_id = cls.subject_id

        duplicates = []
        for record in records:
            if "student_id" not in record or "participation_score" not in record:
                return jsonify({"error": "Each record must include student_id and participation_score"}), 400

            student_id = int(record["student_id"])
            existing_record = Participation.query.filter_by(
                student_id=student_id,
                subject_id=subject_id,
                week_number=int(week_number)
            ).first()

            if existing_record:
                # Retrieve the student's full name
                student_obj = Students.query.get(student_id)
                student_name = ""
                if student_obj:
                    user_obj = Users.query.get(student_obj.user_id)
                    if user_obj:
                        student_name = user_obj.name
                duplicates.append({
                    "student_id": student_id,
                    "student_name": student_name,
                    "existing_score": existing_record.participation_score
                })
                if force_update:
                    existing_record.participation_score = float(record["participation_score"])
            else:
                new_participation = Participation(
                    student_id=student_id,
                    subject_id=subject_id,
                    week_number=int(week_number),
                    participation_score=float(record["participation_score"])
                )
                db.session.add(new_participation)

        if duplicates and not force_update:
            return jsonify({
                "error": f"Participation for week {week_number} already exists for some students.",
                "duplicates": duplicates
            }), 400

        db.session.commit()

        if force_update:
            return jsonify({"message": "Participation records updated successfully!"}), 200
        else:
            return jsonify({"message": "Participation recorded successfully!"}), 201

    except Exception as e:
        db.session.rollback()
        app.logger.exception("Error adding participation")
        return jsonify({"error": f"Failed to record participation: {str(e)}"}), 500





# -------------------------- put homework Endpoint --------------------------
@app.route("/homework", methods=["POST"])
def add_homework():
    data = request.get_json() or {}
    teacher_id = data.get("teacher_id")
    class_id = data.get("class_id")
    title = data.get("title")
    description = data.get("description", "")
    file_path = data.get("file_path", None)

    if not teacher_id or not class_id or not title:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Validate that the class exists
        cls = Classes.query.get(class_id)
        if not cls:
            return jsonify({"error": "Class not found"}), 404

        # Save homework record with class_id
        new_homework = Homework(
            class_id=class_id,
            subject_id=cls.subject_id,  # derive subject_id from the chosen class
            teacher_id=teacher_id,
            title=title,
            description=description,
            file_path=file_path
        )
        db.session.add(new_homework)
        db.session.commit()
        return jsonify({"message": "Homework posted successfully!"}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding homework: {str(e)}")
        return jsonify({"error": "Failed to post homework"}), 500
#--------------------------------------------------

@app.route("/homework", methods=["GET"])
def get_homework():
    class_id = request.args.get("class_id")
    if not class_id:
        return jsonify({"error": "class_id is required"}), 400
    homework_list = Homework.query.filter_by(class_id=class_id).all()
    data = []
    for hw in homework_list:
        data.append({
            "id": hw.id,
            "class_id": hw.class_id,
            "subject_id": hw.subject_id,
            "teacher_id": hw.teacher_id,
            "title": hw.title,
            "description": hw.description,
            "file_path": hw.file_path,
            "created_at": hw.created_at.strftime("%Y-%m-%d")
        })
    return jsonify(data), 200




#--------------------homework list --- 


@app.route("/teacher/<int:teacher_id>/homeworks", methods=["GET"])
def get_teacher_homeworks(teacher_id):
    try:
        class_id = request.args.get("class_id")
        if not class_id:
            return jsonify({"error": "Missing class_id"}), 400

        # Verify teacher
        teacher = Teachers.query.get(teacher_id)
        if not teacher:
            return jsonify({"error": "Teacher not found"}), 404
        
        # Optionally, you can also verify that teacher_id matches the class's teacher_id 
        # if you want strict security checks. But for now we keep it simple.

        # Filter the Homework table
        hw_list = Homework.query.filter_by(teacher_id=teacher_id, subject_id=None).all()
        # ^^^ This line is pseudo; you'll want to adjust your logic so it 
        # includes `class_id` or uses the subject_id from the Classes table, etc.

        # Typically, Homework references subject_id, not class_id. 
        # If you want to filter by class, you'll do something like:
        # 1) Find the class record by class_id 
        # 2) Then match subject_id + teacher_id 
        # And filter Homework that matches that subject and teacher

        cls = Classes.query.get(class_id)
        if not cls:
            return jsonify([]), 200

        # Now we get all HW for that teacher + subject:
        hw_list = Homework.query.filter_by(
            teacher_id=teacher_id,
            subject_id=cls.subject_id
        ).all()

        # Build response
        data = []
        for hw in hw_list:
            data.append({
                "id": hw.id,
                "title": hw.title,
                "description": hw.description,
                "file_path": hw.file_path,
                "created_at": hw.created_at.isoformat() if hw.created_at else None
            })
        return jsonify(data), 200

    except Exception as e:
        print("Error fetching homeworks:", str(e))
        return jsonify({"error": str(e)}), 500
    

#----------------------- student homework view -------








#----------------homework delete ----


@app.route("/homework/<int:hw_id>", methods=["DELETE"])
def delete_homework(hw_id):
    try:
        hw = Homework.query.get(hw_id)
        if not hw:
            return jsonify({"error": "Homework not found"}), 404

        db.session.delete(hw)
        db.session.commit()
        return jsonify({"message": "Homework deleted successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        print("Error deleting homework:", str(e))
        return jsonify({"error": str(e)}), 500




# -------------------------- Chat Endpoints --------------------------

@app.route("/messages", methods=["GET"])
def get_messages():
    try:
        # Get teacher_id and student_id from query parameters
        teacher_id = request.args.get("teacher_id")
        student_id = request.args.get("student_id")
        if teacher_id is None or student_id is None:
            return jsonify({"error": "Missing teacher_id or student_id in query"}), 400

        # Convert to integers
        teacher_id = int(teacher_id)
        student_id = int(student_id)

        # Query all messages where (sender==teacher_id AND receiver==student_id)
        # OR (sender==student_id AND receiver==teacher_id)
        msgs = Messages.query.filter(
            ((Messages.sender_id == teacher_id) & (Messages.receiver_id == student_id)) |
            ((Messages.sender_id == student_id) & (Messages.receiver_id == teacher_id))
        ).order_by(Messages.sent_at).all()

        data = []
        for m in msgs:
            data.append({
                "id": m.id,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "message": m.message,
                "sent_at": m.sent_at.isoformat()  # Format the timestamp as ISO string
            })
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

#----------------------------------mesg -------------- 

@app.route("/messages", methods=["POST"])
def send_message():
    data = request.get_json() or {}
    sender_id = data.get("sender_id")
    receiver_id = data.get("receiver_id")
    message = data.get("message")

    if not all([sender_id, receiver_id, message]):
        return jsonify({"error": "Missing fields"}), 400

    try:
        sender = Users.query.get(int(sender_id))
        receiver = Users.query.get(int(receiver_id))
        if not sender or not receiver:
            return jsonify({"error": "Invalid sender or receiver ID"}), 400

        # Create new message with is_read flag = False by default.
        new_msg = Messages(
            sender_id=int(sender_id),
            receiver_id=int(receiver_id),
            message=message,
            is_read=False
        )
        db.session.add(new_msg)
        db.session.commit()
        return jsonify({"message": "Message sent!"}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error sending message: {str(e)}")
        return jsonify({"error": "Failed to send message. Check server logs for details."}), 500


#------------------------------------------------------



@app.route("/messages/mark_read/teacher", methods=["PATCH"])
def mark_messages_as_read_by_teacher():
    data = request.get_json() or {}
    teacher_id = data.get("teacher_id")
    student_id = data.get("student_id")
    if not teacher_id or not student_id:
        return jsonify({"error": "Missing teacher_id or student_id"}), 400
    try:
        teacher_id = int(teacher_id)
        student_id = int(student_id)
        # For teacher chat: mark messages that were sent from the student to the teacher as read.
        msgs = Messages.query.filter(
            and_(
                Messages.sender_id == student_id,   # messages from student
                Messages.receiver_id == teacher_id,   # to teacher
                Messages.is_read == False
            )
        ).all()
        for msg in msgs:
            msg.is_read = True
        db.session.commit()
        return jsonify({"message": "Messages marked as read!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to mark messages as read: {str(e)}"}), 500



@app.route("/messages/mark_read/student", methods=["PATCH"])
def mark_messages_as_read_by_student():
    data = request.get_json() or {}
    teacher_id = data.get("teacher_id")
    student_id = data.get("student_id")
    if not teacher_id or not student_id:
        return jsonify({"error": "Missing teacher_id or student_id"}), 400
    try:
        teacher_id = int(teacher_id)
        student_id = int(student_id)
        # Mark all messages that were sent from teacher to student (unread) as read.
        msgs = Messages.query.filter(
            and_(
                Messages.sender_id == teacher_id,
                Messages.receiver_id == student_id,
                Messages.is_read == False
            )
        ).all()
        for msg in msgs:
            msg.is_read = True
        db.session.commit()
        return jsonify({"message": "Messages marked as read!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to mark messages as read: {str(e)}"}), 500



#----------------------------
@app.route("/messages/unread_count", methods=["GET"])
def get_unread_count():
    teacher_id = request.args.get("teacher_id")
    student_id = request.args.get("student_id")
    if not teacher_id or not student_id:
        return jsonify({"error": "Missing teacher_id or student_id"}), 400
    try:
        teacher_id = int(teacher_id)
        student_id = int(student_id)
        count = Messages.query.filter(
            and_(
                Messages.sender_id == teacher_id,
                Messages.receiver_id == student_id,
                Messages.is_read == False
            )
        ).count()
        return jsonify({"unread_count": count}), 200
    except Exception as e:
        return jsonify({"error": f"Error retrieving unread count: {str(e)}"}), 500

#-------------------  -----

@app.route("/messages/unread_count/teacher", methods=["GET"])
def get_unread_count_teacher():
    teacher_id = request.args.get("teacher_id")
    student_id = request.args.get("student_id")
    if not teacher_id or not student_id:
        return jsonify({"error": "Missing teacher_id or student_id"}), 400
    try:
        teacher_id = int(teacher_id)
        student_id = int(student_id)
        count = Messages.query.filter(
            and_(
                Messages.sender_id == student_id,    # messages from student
                Messages.receiver_id == teacher_id,    # sent to teacher
                Messages.is_read == False
            )
        ).count()
        return jsonify({"unread_count": count}), 200
    except Exception as e:
        return jsonify({"error": f"Error retrieving unread count: {str(e)}"}), 500


#-----   ----

@app.route("/teacher/<int:teacher_id>/students", methods=["GET"])
def get_teacher_students(teacher_id):
    # Verify the teacher exists in the Teachers table
    teacher = Teachers.query.get(teacher_id)
    if not teacher:
        return jsonify({"error": "Teacher not found"}), 404

    # Find all classes taught by this teacher
    teacher_classes = Classes.query.filter_by(teacher_id=teacher_id).all()
    class_ids = [c.id for c in teacher_classes]

    # Get all student_subjects records for those classes
    enrollment_records = StudentSubjects.query.filter(
        StudentSubjects.class_id.in_(class_ids)
    ).all()

    # Extract the unique student IDs from these records
    student_ids = set(record.student_id for record in enrollment_records)

    result = []
    for sid in student_ids:
        stu = Students.query.get(sid)
        if stu:
            user = Users.query.get(stu.user_id)
            if user:
                # Return both the student table ID and the user's ID
                result.append({
                    "student_table_id": stu.id,   # your internal student ID (optional)
                    "user_id": user.id,           # this is needed for messaging
                    "name": user.name,
                    "email": user.email
                })
    return jsonify(result), 200





#------------ for My Grade in Student Page----

@app.route("/student/<int:student_id>/grades-overview", methods=["GET"])
def get_grades_overview(student_id):
    try:
        # 1) Compute or fetch your average attendance
        #    For example, from your get_student_real_data or a custom query
        attendance_percent, participation_percent, _ = get_student_real_data(student_id)

        # 2) Build the array of subjects with their exam records
        subjects = []
        # Example approach:
        #    1) Find all subject IDs for which the student has a record.
        #    2) Or retrieve them from your student_subjects table.
        from sqlalchemy import distinct

        subject_ids = db.session.query(distinct(StudentSubjects.subject_id)) \
                                .filter_by(student_id=student_id).all()
        # subject_ids might be a list of tuples like [(1,), (2,)]
        subject_ids = [row[0] for row in subject_ids]

        for sid in subject_ids:
            # Get the subject name
            subj_obj = Subjects.query.get(sid)
            if not subj_obj:
                continue

            # Query all exam records for this subject
            exam_records = Grades.query.filter_by(student_id=student_id, subject_id=sid).all()
            # Convert them into a JSON-friendly list
            exam_list = []
            for record in exam_records:
                exam_list.append({
                    "exam_type": record.exam_type,
                    "score": record.score
                })

            subjects.append({
                "subject_id": sid,
                "subject_name": subj_obj.name,
                "examRecords": exam_list
            })

        # 3) Return everything as JSON
        return jsonify({
            "avgAttendance": attendance_percent,
            "avgParticipation": participation_percent,
            "subjects": subjects
        }), 200

    except Exception as e:
        print("Error in get_grades_overview:", e)
        return jsonify({"error": "Failed to fetch grades overview"}), 500










@app.route("/student/<int:student_id>/subjects", methods=["GET"])
def get_student_subjects(student_id):
    """
    Return a list of all subjects that this student is enrolled in.
    """
    student = Students.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    # StudentSubjects table holds (student_id, subject_id, class_id)
    enrollment_records = StudentSubjects.query.filter_by(student_id=student_id).all()
    # Extract unique subject IDs
    subject_ids = set(record.subject_id for record in enrollment_records)
    data = []
    for sid in subject_ids:
        subj = Subjects.query.get(sid)
        if subj:
            data.append({
                "id": subj.id,
                "name": subj.name
            })
    return jsonify(data), 200

# -------------------------- Homeworks for a Student --------------------------
@app.route("/student/<int:student_id>/homeworks", methods=["GET"])
def get_student_homeworks(student_id):
    # Get all enrollment records from StudentSubjects for this student.
    enrollment_records = StudentSubjects.query.filter_by(student_id=student_id).all()
    # Extract a list of class_ids the student is enrolled in.
    class_ids = [record.class_id for record in enrollment_records]
    
    if not class_ids:
        return jsonify([]), 200  # Student not enrolled in any class; return empty list

    # Now query Homework records where class_id is in the list of class_ids.
    homework_list = Homework.query.filter(Homework.class_id.in_(class_ids)).all()
    
    data = []
    for hw in homework_list:
        subject = Subjects.query.get(hw.subject_id)
        teacher_record = Teachers.query.get(hw.teacher_id)
        teacher_user = Users.query.get(teacher_record.user_id) if teacher_record else None
        data.append({
            "id": hw.id,
            "class_id": hw.class_id,
            "subject_id": hw.subject_id,
            "subject_name": subject.name if subject else "Unknown",
            "teacher_id": hw.teacher_id,
            "teacher_name": teacher_user.name if teacher_user else "Unknown",
            "title": hw.title,
            "description": hw.description,
            "file_path": hw.file_path,
            "created_at": hw.created_at.strftime("%Y-%m-%d") if hw.created_at else None
        })
    return jsonify(data), 200








@app.route("/student/<int:student_id>/teachers", methods=["GET"])
def get_student_teachers(student_id):
    student = Students.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    enrollments = StudentSubjects.query.filter_by(student_id=student_id).all()
    teacher_ids = set()
    for enrollment in enrollments:
        cls = Classes.query.get(enrollment.class_id)
        if cls:
            teacher_ids.add(cls.teacher_id)

    result = []
    for tid in teacher_ids:
        teacher = Teachers.query.get(tid)
        if teacher:
            user = Users.query.get(teacher.user_id)
            if user:
                # IMPORTANT: Make sure you return "user_id" here
                result.append({
                    "id": teacher.id,          # teacher's table ID
                    "name": user.name,
                    "user_id": user.id         # teacher's user ID from the Users table
                })
    return jsonify(result), 200






@app.route("/student_messages", methods=["GET"])
def get_student_messages():
    """
    Fetch messages between a student and a teacher, but on a new endpoint
    to avoid conflicts with the teacher's /messages route.
    Expects query params: ?teacher_id=xx&student_id=yy
    """
    try:
        teacher_id = request.args.get("teacher_id")
        student_id = request.args.get("student_id")
        if teacher_id is None or student_id is None:
            return jsonify({"error": "Missing teacher_id or student_id in query"}), 400

        teacher_id = int(teacher_id)
        student_id = int(student_id)

        msgs = Messages.query.filter(
            ((Messages.sender_id == teacher_id) & (Messages.receiver_id == student_id)) |
            ((Messages.sender_id == student_id) & (Messages.receiver_id == teacher_id))
        ).order_by(Messages.sent_at).all()

        data = []
        for m in msgs:
            data.append({
                "id": m.id,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "message": m.message,
                "sent_at": m.sent_at.isoformat()
            })
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/student_messages", methods=["POST"])
def send_student_message():
    """
    Send a new message from student to teacher or vice versa on a new endpoint.
    Expects JSON: { sender_id, receiver_id, message }
    """
    data = request.get_json() or {}
    sender_id = data.get("sender_id")
    receiver_id = data.get("receiver_id")
    message = data.get("message")

    if not all([sender_id, receiver_id, message]):
        return jsonify({"error": "Missing fields"}), 400

    try:
        sender_id = int(sender_id)
        receiver_id = int(receiver_id)

        sender = Users.query.get(sender_id)
        receiver = Users.query.get(receiver_id)
        if not sender or not receiver:
            return jsonify({"error": "Invalid sender or receiver ID"}), 400

        new_msg = Messages(
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message
        )
        db.session.add(new_msg)
        db.session.commit()
        return jsonify({"message": "Message sent!"}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error sending message: {str(e)}")
        return jsonify({"error": "Failed to send message. Check server logs for details."}), 500



# 
# --------------------------
# GET Notifications for a Student
# --------------------------
@app.route("/student/<int:student_id>/notifications", methods=["GET"])
def get_student_notifications(student_id):
    try:
        student = Students.query.get(student_id)
        if not student:
            return jsonify({"error": "Student not found"}), 404

        # Optional: Accept a query parameter 'after' to filter out older notifications.
        after_str = request.args.get("after", None)
        after = None
        if after_str:
            try:
                after = datetime.fromisoformat(after_str)
            except Exception as parse_error:
                return jsonify({"error": "Invalid 'after' timestamp format."}), 400

        # Define a basic threshold for “new” notifications (e.g., notifications from the last 24 hours)
        default_threshold = datetime.utcnow() - timedelta(days=1)

        notifications_list = []

        # ---------------------------------------
        # 1) New messages
        # ---------------------------------------
        new_messages = Messages.query.filter(
            Messages.receiver_id == student.user_id,
            Messages.sent_at >= default_threshold
        ).all()
        if new_messages:
            # Use the latest sent_at time in these messages for comparison.
            max_msg_time = max(m.sent_at for m in new_messages)
            if after is None or max_msg_time > after:
                notifications_list.append({
                    "id": 1001,
                    "content": f"You have {len(new_messages)} new message{'s' if len(new_messages) > 1 else ''}.",
                    "link": "/student/chat",
                    "timestamp": max_msg_time.isoformat()
                })

        # ---------------------------------------
        # 2) New homework
        # ---------------------------------------
        enrollment_records = StudentSubjects.query.filter_by(student_id=student_id).all()
        subject_ids = [rec.subject_id for rec in enrollment_records]
        new_homeworks = Homework.query.filter(
            Homework.subject_id.in_(subject_ids),
            Homework.created_at >= default_threshold
        ).all()
        if new_homeworks:
            max_hw_time = max(hw.created_at for hw in new_homeworks)
            if after is None or max_hw_time > after:
                notifications_list.append({
                    "id": 1002,
                    "content": f"There {'are' if len(new_homeworks) > 1 else 'is'} {len(new_homeworks)} new homework assignment{'s' if len(new_homeworks) > 1 else ''}.",
                    "link": "/student/homework",
                    "timestamp": max_hw_time.isoformat()
                })

        # ---------------------------------------
        # 3) New/Updated grades
        # ---------------------------------------
        new_grades = Grades.query.filter(
            Grades.student_id == student_id,
            Grades.recorded_at >= default_threshold
        ).all()
        if new_grades:
            max_grade_time = max(g.recorded_at for g in new_grades)
            if after is None or max_grade_time > after:
                notifications_list.append({
                    "id": 1003,
                    "content": f"You have {len(new_grades)} new or updated grade{'s' if len(new_grades) > 1 else ''}.",
                    "link": "/student/grades",
                    "timestamp": max_grade_time.isoformat()
                })

        return jsonify(notifications_list), 200

    except Exception as e:
        app.logger.exception("Error in get_student_notifications")
        return jsonify({"error": str(e)}), 500


#------------clear notificationss---


@app.route("/notifications/<int:student_id>/clear", methods=["DELETE"])
def clear_student_notifications(student_id):
    """
    Since we're generating notifications on-the-fly from new messages/homework/grades,
    there's nothing to permanently delete. We'll just return success.
    """
    # Optionally, you might verify that student_id is valid, etc.
    # For now, do a quick check:
    stu = Students.query.get(student_id)
    if not stu:
        return jsonify({"error": "Student not found"}), 404

    return jsonify({"message": "Notifications cleared successfully!"}), 200


#----------------------------------------

# ------------------------------
# Helper Function: Compute Past Grade
# ------------------------------
def get_past_grade(student_id):
    # Use only Assignment 1, Quiz 1, Quiz 2, and Exam 1 for past grade calculation.
    assessments = ['Assignment 1', 'Quiz 1', 'Quiz 2', 'Exam 1']
    # Filter grades for this student and only these exam types.
    grades = Grades.query.filter(Grades.student_id == student_id,
                                 Grades.exam_type.in_(assessments)).all()
    if grades:
        scores = [grade.score for grade in grades]
        past_grade = np.mean(scores)
        print(f"Calculated past_grade for student {student_id}: {past_grade} from scores: {scores}")
        return past_grade
    else:
        print(f"No past grades found for student {student_id}")
        return 0

# ------------------------------
# Helper Function: Compute Average Participation by Week
# ------------------------------
def get_average_participation(student_id):
    participations = Participation.query.filter_by(student_id=student_id).all()
    if participations:
        # Group participation scores by week so each week's score is counted only once.
        weekly_scores = {}
        for p in participations:
            week = p.week_number
            if week not in weekly_scores:
                weekly_scores[week] = []
            # Scale participation score from 0-10 to 0-100.
            weekly_scores[week].append(p.participation_score * 10)
        # Compute average for each week, then average the weekly averages.
        week_averages = [np.mean(scores) for scores in weekly_scores.values()]
        avg_participation = np.mean(week_averages)
        print(f"Calculated avg participation for student {student_id}: {avg_participation} from weekly averages: {week_averages}")
        return avg_participation
    else:
        print(f"No participation records for student {student_id}")
        return 0

# ------------------------------
# Helper Function: Get Student Real Data for Prediction
# ------------------------------
def get_student_real_data(student_id):
    # --- Calculate Attendance Percent with weight for Late ---
    total_records = Attendance.query.filter_by(student_id=student_id).count()
    present_count = Attendance.query.filter_by(student_id=student_id, status='Present').count()
    late_count = Attendance.query.filter_by(student_id=student_id, status='Late').count()
    
    if total_records > 0:
        weighted_attendance = present_count + (0.7 * late_count)
        attendance_percent = (weighted_attendance / total_records) * 100
    else:
        attendance_percent = 0  # New student: default to 0%

    # --- Calculate Average Participation ---
    avg_participation = get_average_participation(student_id)

    # --- Calculate Past Grade Average ---
    grades = Grades.query.filter_by(student_id=student_id).all()
    if grades and len(grades) > 0:
        grade_scores = [g.score for g in grades]
        past_grade = sum(grade_scores) / len(grade_scores)
    else:
        past_grade = 0  # New student: default to 0

    return attendance_percent, avg_participation, past_grade


# ------------------------------
# Prediction Endpoint
# ------------------------------
@app.route("/student/<int:student_id>/predict", methods=["GET"])
def predict_student_performance(student_id):
    attendance_percent, participation_percent, past_grade = get_student_real_data(student_id)
    
    # Optionally, if no data is available, you may want to return a default JSON,
    # so that the frontend does not show an error.
    # Here we assume a new student should see 0 performance.
    if attendance_percent == 0 and participation_percent == 0 and past_grade == 0:
        return jsonify({
            "student_id": student_id,
            "attendance_percent": 0,
            "participation_percent": 0,
            "past_grade": 0,
            "predicted_final_grade": 0,
            "message": "No performance data available yet. Check back later once data is added."
        }), 200

    predicted_grade = predict_final_grade(attendance_percent, participation_percent, past_grade)

    return jsonify({
        "student_id": student_id,
        "attendance_percent": attendance_percent,
        "participation_percent": participation_percent,
        "past_grade": past_grade,
        "predicted_final_grade": predicted_grade
    }), 200



# for Ai Chat in student page

@app.route("/student-ai-chat", methods=["POST"])
def student_ai_chat():
    data = request.get_json() or {}
    student_id = data.get("student_id")
    user_message = data.get("message", "")

    if not student_id or not user_message:
        return jsonify({"error": "Missing student_id or message in request."}), 400

    # 1) Fetch the student's subjects for context
    subject_records = StudentSubjects.query.filter_by(student_id=student_id).all()
    subject_ids = [rec.subject_id for rec in subject_records]
    subjects = Subjects.query.filter(Subjects.id.in_(subject_ids)).all()
    subject_names = ", ".join(sub.name for sub in subjects)

    # 2) Fetch the student's grades and create a summary string (only include entries that exist)
    grades_rows = Grades.query.filter_by(student_id=student_id).all()
    grades_summary_list = []
    for g in grades_rows:
        grades_summary_list.append(f"{g.exam_type}: {g.score}")
    grades_summary = "; ".join(grades_summary_list) if grades_summary_list else "No grades available"

    # 3) Get student's real performance data (attendance, participation, past grade)
    try:
        attendance_percent, participation_percent, past_grade = get_student_real_data(student_id)
    except Exception as e:
        return jsonify({"error": f"Error fetching student performance data: {str(e)}"}), 500

    # 4) Build a system prompt for the AI tutor that includes student's subjects, grades, and performance data.
    system_prompt = (
        f"You are an expert educational tutor that advises students using their performance data. "
        f"Student's Subjects: {subject_names}. "
        f"Student's Grades: {grades_summary}. "
        f"Attendance: {attendance_percent:.1f}%, Participation: {participation_percent:.1f}%, Past Grade: {past_grade:.1f}%. "
        "Based on these details, provide detailed, step-by-step study recommendations. "
        "Your answer should include targeted exercises and suggest external resources (such as YouTube tutorials, book links, or online courses) as needed. "
        "Make sure the response includes clickable links where applicable. "
        "Answer clearly and concisely, providing practical advice for improvement."
    )

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=300,
            temperature=0.7
        )
        ai_reply = response.choices[0].message.content.strip()
        return jsonify({"response": ai_reply}), 200
    except Exception as e:
        print("OpenAI API error:", str(e))
        return jsonify({"error": "Failed to get response from AI: " + str(e)}), 500







# --------------------------
# RUN
# --------------------------
if __name__ == "__main__":
    with app.app_context():  # Add application context
        db.create_all()  # Create tables if they don't exist
    app.run(debug=True)

    
