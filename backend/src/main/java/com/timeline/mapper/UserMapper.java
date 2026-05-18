package com.timeline.mapper;

import com.timeline.model.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    User findByEmail(String email);
    User findByUsername(String username);
    User findById(Long id);
    void insert(User user);
}
