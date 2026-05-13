from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import Course, CourseCreate, CourseUpdate
from services.course_service import CourseService

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=List[Course])
def get_all_courses():
    """Get all courses."""
    try:
        courses = CourseService.get_all_courses()
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{course_id}", response_model=Course)
def get_course(course_id: int):
    """Get course by ID."""
    course = CourseService.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("", response_model=Course, status_code=201)
def create_course(course: CourseCreate):
    """Create a new course."""
    try:
        course_id = CourseService.create_course(
            name=course.name,
            code=course.code,
            description=course.description,
            duration=course.duration,
            fees=course.fees,
            is_active=course.is_active
        )
        return CourseService.get_course_by_id(course_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{course_id}", response_model=Course)
def update_course(course_id: int, course: CourseUpdate):
    """Update course details."""
    existing_course = CourseService.get_course_by_id(course_id)
    if not existing_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    try:
        CourseService.update_course(
            course_id=course_id,
            name=course.name,
            code=course.code,
            description=course.description,
            duration=course.duration,
            fees=course.fees,
            is_active=course.is_active
        )
        return CourseService.get_course_by_id(course_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{course_id}")
def delete_course(course_id: int):
    """Delete a course."""
    existing_course = CourseService.get_course_by_id(course_id)
    if not existing_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    try:
        CourseService.delete_course(course_id)
        return {"message": "Course deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
